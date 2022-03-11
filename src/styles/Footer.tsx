import * as React from 'react';
import Typography from '@mui/material/Typography';
import MuiLink from '@mui/material/Link';
import Link from './Link';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

function LightBulbIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6C7.8 12.16 7 10.63 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z" />
    </SvgIcon>
  );
}

export function ProTip() {
  return (
    <Typography sx={{ mt: 6, mb: 3 }} color="text.secondary">
      <LightBulbIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
      Find source code on <Link href="https://github.com/Dentrax/cosigneth" target="_blank">GitHub!</Link>
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
