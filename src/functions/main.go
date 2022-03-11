package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/apex/gateway"
	"github.com/google/go-containerregistry/pkg/authn"
	"github.com/google/go-containerregistry/pkg/name"
	"github.com/google/go-containerregistry/pkg/v1/remote"
	"github.com/sigstore/cosign/cmd/cosign/cli/options"
	"github.com/sigstore/cosign/pkg/oci"
	"github.com/sigstore/cosign/pkg/oci/mutate"
	ociremote "github.com/sigstore/cosign/pkg/oci/remote"
	"github.com/sigstore/cosign/pkg/oci/static"
	sigPayload "github.com/sigstore/sigstore/pkg/signature/payload"
)

type handler struct {
	mux       *http.ServeMux
	remote    []remote.Option
	ociremote []ociremote.Option
	local     bool
}

func (h *handler) remoteOptions(r *http.Request) []ociremote.Option {
	ctx := r.Context()

	var opts []remote.Option
	opts = append(opts, h.remote...)
	opts = append(opts, remote.WithContext(ctx))
	opts = append(opts, remote.WithUserAgent("cosigneth"))

	regOpts := options.RegistryOptions{}
	clientOpts, _ := regOpts.ClientOpts(ctx)
	clientOpts = append(clientOpts, h.ociremote...)
	clientOpts = append(clientOpts, ociremote.WithSignatureSuffix("eth"))
	clientOpts = append(clientOpts, ociremote.WithRemoteOptions(opts...))

	return clientOpts
}

type Option func(h *handler)

func WithRemote(opt []remote.Option) Option {
	return func(h *handler) {
		h.remote = opt
	}
}

func WithOCIRemote(opt []ociremote.Option) Option {
	return func(h *handler) {
		h.ociremote = opt
	}
}

func WithLocal(local bool) Option {
	return func(h *handler) {
		h.local = local
	}
}

func New(opts ...Option) http.Handler {
	h := handler{
		mux: http.NewServeMux(),
	}

	for _, opt := range opts {
		opt(&h)
	}

	h.mux.HandleFunc("/.netlify/functions/api/check", h.handleCheck)
	h.mux.HandleFunc("/.netlify/functions/api/sign", h.handleSign)
	h.mux.HandleFunc("/.netlify/functions/api/signed", h.handleSigned)

	if h.local {
		h.mux.Handle("/", httputil.NewSingleHostReverseProxy(&url.URL{Scheme: "http", Host: "localhost:8080"}))
	}

	return &h
}

func (h *handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	log.Printf("%v", r.URL)
	h.mux.ServeHTTP(w, r)
}

func (h *handler) handleCheck(w http.ResponseWriter, r *http.Request) {
	if err := h.check(w, r); err != nil {
		http.Error(w, fmt.Sprintf("error: %v", err), http.StatusInternalServerError)
	}
}

func (h *handler) handleSign(w http.ResponseWriter, r *http.Request) {
	if err := h.sign(w, r); err != nil {
		http.Error(w, fmt.Sprintf("error: %v", err), http.StatusInternalServerError)
	}
}

func (h *handler) handleSigned(w http.ResponseWriter, r *http.Request) {
	if err := h.signed(w, r); err != nil {
		http.Error(w, fmt.Sprintf("error: %v", err), http.StatusInternalServerError)
	}
}

func (h *handler) getToken(r *http.Request) (string, error) {
	reqToken := r.Header.Get("Authorization")
	splitToken := strings.Split(reqToken, "Bearer")
	if len(splitToken) != 2 {
		return "", fmt.Errorf("couldn't find Bearer in Authorization header")
	}
	return strings.TrimSpace(splitToken[1]), nil
}

func (h *handler) getQuery(r *http.Request, query string) (string, error) {
	q := r.URL.Query()
	if values, ok := q[query]; ok {
		return values[0], nil
	}
	return "", fmt.Errorf("%s query not found", query)
}

func (h *handler) setupCORS(w *http.ResponseWriter, r *http.Request) {
	(*w).Header().Set("Access-Control-Allow-Origin", "*")
	(*w).Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
	(*w).Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
}

type ImageCheckResponse struct {
	Digest string `json:"digest"`
}

type ImageSignedResponse struct {
	Digest  string        `json:"digest"`
	Signers []ImageSigner `json:"signers"`
}

type ImageSigner struct {
	Signer    string `json:"signer"`
	Signature string `json:"signature"`
	Txn       string `json:"txn"`
	Time      string `json:"time"`
}

func (h *handler) check(w http.ResponseWriter, r *http.Request) error {
	h.setupCORS(&w, r)
	if r.Method == "OPTIONS" {
		return nil
	}

	token, err := h.getToken(r)
	if err != nil {
		return fmt.Errorf("get token: %w", err)
	}

	image, err := h.getQuery(r, "image")
	if err != nil {
		return fmt.Errorf("parse image query: %w", err)
	}

	opts := h.remoteOptions(r)
	opts = append(opts, ociremote.WithRemoteOptions(remote.WithAuth(&authn.Bearer{Token: token})))

	ref, err := name.ParseReference(image, name.WeakValidation)
	if err != nil {
		return fmt.Errorf("parse image reference: %w", err)
	}

	digest, err := ociremote.ResolveDigest(ref, opts...)
	if err != nil {
		return fmt.Errorf("resolve digest: %w", err)
	}

	res := ImageCheckResponse{
		Digest: digest.DigestStr(),
	}

	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(res)
	if err != nil {
		return fmt.Errorf("encode result: %w", err)
	}
	w.WriteHeader(http.StatusOK)
	return nil
}

type ImageSignRequest struct {
	// Image reference
	Image string `json:"image"`

	// Blockchain represents chain name
	Blockchain string `json:"blockchain"`

	// Address is public wallet address
	Address string `json:"address"`

	// Txn must be Transaction Hash
	Txn string `json:"txn"`

	// Network is name of the network
	Network string `json:"network"`

	// ChainID of the network
	ChainID int `json:"chainID"`

	// Signature being set by signer.signMessage(message) from ethers.js
	Signature string `json:"signature"`
}

func (h *handler) sign(w http.ResponseWriter, r *http.Request) error {
	h.setupCORS(&w, r)
	if r.Method == "OPTIONS" {
		return nil
	}

	// only accept POST requests
	if r.Method != http.MethodPost {
		return fmt.Errorf("only POST is allowed")
	}

	token, err := h.getToken(r)
	if err != nil {
		return fmt.Errorf("get token")
	}

	var req ImageSignRequest
	err = json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error reading request body: %v", err), http.StatusBadRequest)
	}

	opts := h.remoteOptions(r)
	opts = append(opts, ociremote.WithRemoteOptions(remote.WithAuth(&authn.Bearer{Token: token})))
	opts = append(opts, ociremote.WithSignatureSuffix("eth"))

	ref, err := name.ParseReference(req.Image, name.WeakValidation)
	if err != nil {
		return fmt.Errorf("parse reference: %w", err)
	}

	digest, err := ociremote.ResolveDigest(ref, opts...)
	if err != nil {
		return fmt.Errorf("resolve digest: %w", err)
	}

	payload, err := (&sigPayload.Cosign{
		Image: digest,
	}).MarshalJSON()
	if err != nil {
		return fmt.Errorf("payload: %w", err)
	}

	ociSig, err := Sign(bytes.NewReader(payload), req)
	if err != nil {
		return fmt.Errorf("sign: %w", err)
	}

	se, err := ociremote.SignedEntity(ref, opts...)
	if err != nil {
		return fmt.Errorf("accessing entity: %w", err)
	}

	// Attach the signature to the entity.
	newSE, err := mutate.AttachSignatureToEntity(se, ociSig)
	if err != nil {
		return fmt.Errorf("attach signature: %w", err)
	}

	// Publish the signatures associated with this entity
	if err := ociremote.WriteSignatures(digest.Repository, newSE, opts...); err != nil {
		return fmt.Errorf("write signatures: %w", err)
	}

	w.WriteHeader(http.StatusCreated)
	return nil
}

func Sign(payload io.Reader, req ImageSignRequest) (oci.Signature, error) {
	payloadBytes, err := io.ReadAll(payload)
	if err != nil {
		return nil, err
	}

	opts := static.WithAnnotations(map[string]string{
		"dev.cosignproject.cosign/blockchain":  req.Blockchain,
		"dev.cosignproject.cosign/timestamp":   strconv.FormatInt(time.Now().UTC().Unix(), 10),
		"dev.cosignproject.cosign/transaction": req.Txn,
		"dev.cosignproject.cosign/network":     req.Network,
		"dev.cosignproject.cosign/chainId":     strconv.Itoa(req.ChainID),
		"dev.cosignproject.cosign/signer":      req.Address,
	})

	ociSig, err := static.NewSignature(payloadBytes, req.Signature, opts)
	if err != nil {
		return nil, err
	}

	return ociSig, nil
}

func (h *handler) signed(w http.ResponseWriter, r *http.Request) error {
	h.setupCORS(&w, r)
	if r.Method == "OPTIONS" {
		return nil
	}

	image, err := h.getQuery(r, "image")
	if err != nil {
		return fmt.Errorf("parse image query: %w", err)
	}

	//signer, err := h.getQuery(r, "signer")
	//if err != nil {
	//	return fmt.Errorf("parse signer query: %w", err)
	//}

	opts := h.remoteOptions(r)

	ref, err := name.ParseReference(image, name.WeakValidation)
	if err != nil {
		return fmt.Errorf("parse image reference: %w", err)
	}

	digest, err := ociremote.ResolveDigest(ref, opts...)
	if err != nil {
		return fmt.Errorf("resolve digest: %w", err)
	}

	se, err := ociremote.SignedEntity(digest, opts...)
	if err != nil {
		return fmt.Errorf("accessing signed entity: %w", err)
	}

	s, err := se.Signatures()
	if err != nil {
		return fmt.Errorf("signatures: %w", err)
	}

	signatures, err := s.Get()
	if err != nil {
		return fmt.Errorf("get signatures: %w", err)
	}

	signers := make([]ImageSigner, 0, len(signatures))

	for _, signature := range signatures {
		annotations, err := signature.Annotations()
		if err != nil {
			continue
		}

		sig, err := signature.Base64Signature()
		if err != nil {
			continue
		}

		signedBy, found := annotations["dev.cosignproject.cosign/signer"]
		if !found {
			continue
		}

		txn, found := annotations["dev.cosignproject.cosign/transaction"]
		if !found {
			continue
		}

		timestamp, found := annotations["dev.cosignproject.cosign/timestamp"]
		if !found {
			continue
		}

		i, err := strconv.ParseInt(timestamp, 10, 64)
		if err != nil {
			continue
		}

		signers = append(signers, ImageSigner{
			Signer:    signedBy,
			Signature: sig,
			Txn:       txn,
			Time:      time.Unix(i, 0).String(),
		})
	}

	result := ImageSignedResponse{
		Digest:  digest.DigestStr(),
		Signers: signers,
	}

	if len(result.Signers) == 0 {
		return fmt.Errorf("not found any signatures")
	}

	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(result)
	if err != nil {
		return fmt.Errorf("encode result: %w", err)
	}
	w.WriteHeader(http.StatusOK)
	return nil
}

func main() {
	port := flag.Int("port", -1, `"set a port number to debug locally"`)
	flag.Parse()
	local := *port != -1

	log.Println("starting cosigneth")

	handler := New(WithRemote([]remote.Option{}), WithOCIRemote([]ociremote.Option{}), WithLocal(local))

	if local {
		log.Println("starting local server")
		log.Fatal(http.ListenAndServe(fmt.Sprintf(":%d", *port), handler))
	}

	log.Fatal(gateway.ListenAndServe("n/a", handler))
}
