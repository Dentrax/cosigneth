import * as React from 'react';
import Typography from '@mui/material/Typography';
import MuiLink from '@mui/material/Link';
import Link from './Link';
import StarIcon from '@mui/icons-material/Star';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export function ProTip() {
  return (
    <Typography sx={{ mt: 6, mb: 3 }} color="text.secondary">
      <StarIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
      Find source code on <Link href="https://github.com/Dentrax/cosigneth" target="_blank">GitHub!</Link>
      <StarIcon sx={{ ml: 1, verticalAlign: 'middle' }} />
    </Typography>
  );
}

export function PoweredBy() {
  return (
    <Typography variant="body2" color="text.secondary" align="center">
      Powered by&nbsp;
      <Link href="https://mui.com" target="_blank">mui</Link>,&nbsp;
      <Link href="https://github.com/vercel/next.js" target="_blank">next.js</Link>,&nbsp;
      <Link href="https://github.com/ethers-io/ethers.js" target="_blank">ethers.js</Link>,&nbsp;
      <Link href="https://github.com/sigstore/cosign" target="_blank">cosign</Link>,&nbsp;
      <Link href="https://github.com/google/go-containerregistry" target="_blank">go-containerregistry</Link>
      !
    </Typography>
  );
}

export function Copyright() {
  return (
    <Typography variant="body2" color="text.secondary" align="center">
      {'Copyright © '}
      <MuiLink color="inherit" href="https://mui.com/">
        Quux
      </MuiLink>{' '}
      {new Date().getFullYear()}.
    </Typography>
  );
}
