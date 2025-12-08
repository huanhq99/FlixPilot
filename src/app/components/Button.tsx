'use client';

import { default as MUIBUtton } from '@mui/material/Button'

export default function Button(props: React.ComponentProps<typeof MUIBUtton>) {
    return <MUIBUtton {...props} />
}