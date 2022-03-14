import { useRef, useState, useEffect, MouseEventHandler } from 'react';
import type { NextPage } from 'next';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Link from '../styles/Link';
import { ProTip, Copyright, PoweredBy } from '../styles/Footer';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import InputAdornment from '@mui/material/InputAdornment';
import ReceiptIcon from '@mui/icons-material/Receipt';
import LoadingButton from '@mui/lab/LoadingButton';
import IconButton from '@mui/material/IconButton';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import DocumentScannerIcon from '@mui/icons-material/DocumentScanner';
import PersonPinIcon from '@mui/icons-material/PersonPin';
import LockIcon from '@mui/icons-material/Lock';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LinkIcon from '@mui/icons-material/Link';

import { 
  connect,
  sign,
  verify,
  mint,
  info
} from '../scripts/interact';

import {
  doCheck,
  doSign,
  doSigned
} from '../scripts/cosigneth'

const Home: NextPage = () => {
  const [values, setValues] = useState({
    showPassword: false,
  });

  const initialVerifyState = {
    signer: '',
    digest: '',
    signature: '',
    txn: '',
    time: ''
  };

  const [walletStatus, setWalletStatus] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");

  const [signStatus, setSignStatus] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState(false);

  const [verifyInfo, setVerifyInfo] = useState(initialVerifyState);

  const [txnHash, setTxnHash] = useState("");

  const [progress, setProgress] = useState("");
  const [progressFail, setProgressFail] = useState(false);
  const [progressDone, setProgressDone] = useState(false);

  const textSignImageRef = useRef<HTMLInputElement | null>(null);
  const textSignRegistryTokenRef = useRef<HTMLInputElement | null>(null);

  const textVerifyImageRef = useRef<HTMLInputElement | null>(null);
  const textVerifySignerRef = useRef<HTMLInputElement | null>(null);

  const onConnectPressed = async () => {
    const res = await connect();
    setWalletStatus(res.status);
    setWalletAddress(res.address);
  };

  const onSignPressed = async () => {
    if (!textSignImageRef?.current?.value) {
      return;
    }

    if (!textSignRegistryTokenRef?.current?.value) {
      return;
    }

    setVerifyStatus(false);
    setSignStatus(true);
    setProgressFail(false);
    setProgressDone(false);
    setTxnHash('');
    setVerifyInfo(initialVerifyState);
    setProgress("[1/5] Checking image digest...");

    const image = textSignImageRef.current.value;
    const token = textSignRegistryTokenRef.current.value;

    const doCheckRes = await doCheck({image: image, token: token});
    if (doCheckRes.status == false) {
      setSignStatus(false);
      setProgressFail(true);
      setProgress(doCheckRes.response);
      return;
    }

    console.log(doCheckRes.response.digest);
    console.log(walletAddress);

    setProgress("[2/5] Getting information from injected web3 client...");

    const infoRes = await info();
    if (infoRes.status == false) {
      setSignStatus(false);
      setProgressFail(true);
      setProgress(infoRes.result);
      return;
    }

    console.log(infoRes);

    setProgress("[3/5] Signing digest...");

    const signRes = await sign(doCheckRes.response.digest, walletAddress);
    if (signRes.status == false) {
      setSignStatus(false);
      setProgressFail(true);
      setProgress(signRes.result);
      return;
    }
    
    console.log(signRes);

    setProgress("[4/5] Minting signature...");

    const mintRes = await mint(image, signRes.result);
    if (mintRes.status == false) {
      setSignStatus(false);
      setProgressFail(true);
      setProgress(mintRes.result);
      return;
    }

    console.log(mintRes);

    setProgress("[5/5] Saving signature...");

    const doSignRes = await doSign({
      image: image, 
      token: token, 
      signature: signRes.result,
      address: walletAddress,
      blockchain: 'Ethereum',
      txn: mintRes.txn,
      network: infoRes.network,
      chainId: infoRes.chainId as number,
    });
    if (doSignRes.status == false) {
      setSignStatus(false);
      setProgressFail(true);
      setProgress(doSignRes.response);
      return;
    }
    console.log(doSignRes);

    setProgress("SIGNED!");
    setTxnHash(mintRes.txn);

    setSignStatus(false);
    setProgressDone(true);
  };

  const onVerifyPressed = async () => {
    if (!textVerifyImageRef?.current?.value) {
      return;
    }

    if (!textVerifySignerRef?.current?.value) {
      return;
    }

    setSignStatus(false);
    setVerifyStatus(true);
    setProgressFail(false);
    setProgressDone(false);
    setVerifyInfo(initialVerifyState);
    setTxnHash('');
    setProgress("[1/2] Getting signatures from image...");

    const image = textVerifyImageRef.current.value;
    const signer = textVerifySignerRef.current.value;

    const doSignedRes = await doSigned({image: image, signer: signer});
    if (doSignedRes.status == false) {
      setVerifyStatus(false);
      setProgressFail(true);
      setProgress(doSignedRes.response);
      return;
    }

    console.log(doSignedRes);

    const owner = doSignedRes.response.signers.find((x: { signer: string; }) => x.signer.toLowerCase() === signer.toLowerCase());
    console.log("Found signer: ", owner);

    if (!owner) {
      setVerifyStatus(false);
      setProgressFail(true);
      setProgress("Signer not found on image reference");
      return;
    }
    
    setProgress("[2/2] Verifying digest...");

    const verifyRes = await verify(image, signer, doSignedRes.response.digest, owner.signature);
    if (verifyRes.status == false) {
      setVerifyStatus(false);
      setProgressFail(true);
      setProgress(verifyRes.result);
      return;
    }
    console.log(verifyRes);

    setVerifyInfo({
      signer: owner.signer,
      digest: doSignedRes.response.digest,
      signature: owner.signature,
      txn: owner.txn,
      time: owner.time
    });

    setProgress("VERIFIED!");
    setVerifyStatus(false);
    setProgressDone(true);
  };

  const handleClickShowPassword = () => {
    setValues({
      ...values,
      showPassword: !values.showPassword,
    });
  };

  const handleMouseDownPassword = (event: any) => {
    event.preventDefault();
  };

  return (
    <Container component="main" maxWidth="xl">
      <Box
        sx={{
          my: 4,
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Typography  component="h1" variant="h4" gutterBottom>
          Cosigneth
        </Typography>

        <Grid 
          container 
          direction="row"
          justifyContent="center"
          alignItems="center"
        >

          {/* Sign */ }
          <Box 
            component="form" 
            noValidate 
            sx={{ 
              color: '#387780',
              flexDirection: 'column',
              alignItems: 'center',
              border: `1px solid #62C370`,
              borderRadius: '2rem',
              padding: '1.5rem 2.5rem',
            }}
          >
            <TextField
              margin="normal"
              required 
              fullWidth
              autoFocus
              id="outlined-required" 
              label="IMAGE REFERENCE"
              variant='outlined'
              placeholder="foo/bar:0.1.0"
              inputRef={textSignImageRef}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <ReceiptIcon />
                  </InputAdornment>
                )
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="outlined-password-input"
              label="ACCESS TOKEN"
              type={values.showPassword ? 'text' : 'password'}
              variant='outlined'
              autoComplete="current-password"
              placeholder='eyJhbGci...'
              inputRef={textSignRegistryTokenRef}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="start">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleClickShowPassword}
                      onMouseDown={handleMouseDownPassword}
                      edge="end"
                    >
                      {values.showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <Link href='https://docs.docker.com/registry/spec/auth/oauth/#getting-a-token' target="_blank" display='flex' variant='body2' color='#387780'>
              How to get an Access Token?
            </Link>
            <LoadingButton
              variant="contained" 
              component={Link} 
              noLinkStyle 
              href="/"
              fullWidth
              loading={signStatus}
              loadingPosition="start"
              disabled={!walletStatus || signStatus || verifyStatus}
              onClick={onSignPressed}
              startIcon={<AssignmentTurnedInIcon />}
              sx={{ mt: 3, mb: 2 }}
            >
              SIGN
            </LoadingButton>
          </Box>

          {/* Connect Wallet */ }
          <Box 
            component="form" 
            noValidate
            px={8}
          >
            <Button
              variant="contained" 
              component={Link} 
              noLinkStyle 
              href="/"
              fullWidth
              disabled={walletStatus}
              onClick={onConnectPressed}
              sx={{ mt: 3, mb: 2 }}
            >
              Connect Wallet
            </Button>
          </Box>

          {/* Verify */ }
          <Box 
            component="form" 
            noValidate 
            sx={{ 
              color: '#387780',
              flexDirection: 'column',
              alignItems: 'center',
              border: `1px solid #62C370`,
              borderRadius: '2rem',
              padding: '1.5rem 2.5rem',
            }}
          >
            <TextField
              margin="normal"
              required 
              fullWidth
              id="outlined-required" 
              label="IMAGE REFERENCE"
              placeholder="foo/bar:0.1.0"
              inputRef={textVerifyImageRef}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <ReceiptIcon />
                  </InputAdornment>
                )
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="outlined-required"
              label="SIGNER ADDRESS"
              placeholder='0x0000000000000000000000000000000000000000'
              inputRef={textVerifySignerRef}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <ContactMailIcon />
                  </InputAdornment>
                )
              }}
            />
            <Link href='https://info.etherscan.com/what-is-an-ethereum-address' target="_blank" display='flex' variant='body2' color='#387780'>
              What is an Address?
            </Link>
            <LoadingButton
              variant="contained" 
              component={Link} 
              noLinkStyle 
              href="/"
              fullWidth
              loading={verifyStatus}
              loadingPosition="start"
              disabled={!walletStatus || verifyStatus || signStatus}
              onClick={onVerifyPressed}
              startIcon={<CheckCircleOutlineIcon />}
              sx={{ mt: 3, mb: 2 }}
            >
              VERIFY
            </LoadingButton>
          </Box>
        </Grid>

        <Typography
          sx={{
            mt: 3,
            visibility: signStatus || verifyStatus ? 'visible' : 'visible',
            color: progressFail ? 'red' : progressDone ? 'green' : 'black',
          }}
        >
          {progress}
        </Typography>

        <Link 
          href={"https://rinkeby.etherscan.io/tx/" + txnHash} 
          target="_blank" 
          display='flex' 
          variant='body2' 
          color='#387780'
          visibility={progressDone ? 'visible' : 'hidden'}
        >
         {txnHash}
        </Link>

        <List sx={{
          visibility: progressDone && JSON.stringify(verifyInfo) !== JSON.stringify(initialVerifyState) ? 'visible' : 'hidden',
        }}>
          <ListItem>
            <ListItemAvatar>
              <PersonPinIcon fontSize='large' />
            </ListItemAvatar>
            <ListItemText primary="Signer" secondary={verifyInfo.signer} />
          </ListItem>
          <ListItem>
            <ListItemAvatar>
              <DocumentScannerIcon fontSize='large' />
            </ListItemAvatar>
            <ListItemText primary="Digest" secondary={verifyInfo.digest} />
          </ListItem>
          <ListItem>
            <ListItemAvatar>
              <LockIcon fontSize='large' />
            </ListItemAvatar>
            <ListItemText primary="Signature" secondary={verifyInfo.signature} />
          </ListItem>
          <ListItem>
            <ListItemAvatar>
              <AccessTimeIcon fontSize='large' />
            </ListItemAvatar>
            <ListItemText primary="Time" secondary={verifyInfo.time} />
          </ListItem>
          <ListItem button component="a" href={"https://rinkeby.etherscan.io/tx/" + verifyInfo.txn} target="_blank">
            <ListItemAvatar>
              <LinkIcon fontSize='large' />
            </ListItemAvatar>
            <ListItemText primary="Transaction Hash" secondary={verifyInfo.txn} />
          </ListItem>
        </List>
        
        {/* Footer */ }
        <ProTip />
        <PoweredBy />
      </Box>
    </Container>
  )
}

export default Home
