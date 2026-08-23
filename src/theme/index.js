// src/theme/index.js
//
// Wires the burrow's theme. Dark mode locked, Geist Sans reads, Geist Mono
// labels, the studio's pixel scale and rail, the burrow's teal. The solid
// button is warm white with night text and turns teal on hover, the same
// gesture as the studio's button turning lime.
//
// typography.js and layout.js are copies of the studio's. If a value moves
// there, move it here in the same commit. colors.js is this room's own.
//
// No oxford commas, no em dashes.

import { extendTheme } from '@chakra-ui/react';
import { colors } from './colors';
import { typography } from './typography';
import { EASE } from './layout';

const theme = extendTheme({
  config: { initialColorMode: 'dark', useSystemColorMode: false },
  colors,
  fonts: typography.fonts,
  fontSizes: typography.fontSizes,
  textStyles: typography.textStyles,
  styles: {
    global: {
      'html, body': {
        bg: colors.surface.base,
        color: colors.text.primary,
        fontFamily: typography.fonts.body,
        overflowX: 'clip',
        WebkitFontSmoothing: 'antialiased',
      },
      '*:focus-visible': { outline: '2px solid', outlineColor: colors.accent.signal, outlineOffset: '2px' },
      '::selection': { bg: colors.accent.signal, color: colors.text.inverse },
      'code, pre, .mono': { fontFamily: typography.fonts.mono },
    },
  },
  components: {
    Button: {
      baseStyle: {
        fontFamily: typography.fonts.heading,
        fontWeight: 600,
        letterSpacing: '-0.01em',
        borderRadius: 'full',
        textTransform: 'lowercase',
        transition: `background 220ms ${EASE}, color 220ms ${EASE}, border-color 220ms ${EASE}, transform 220ms ${EASE}`,
      },
      sizes: {
        lg: { h: '52px', px: 7, fontSize: '16px' },
        md: { h: '44px', px: 6, fontSize: '15px' },
        sm: { h: '36px', px: 4, fontSize: '14px' },
      },
      variants: {
        solid: {
          bg: colors.text.primary,
          color: colors.text.inverse,
          _hover: { bg: colors.accent.signal, color: colors.text.inverse, transform: 'translateY(-1px)' },
          _active: { transform: 'translateY(0)' },
        },
        outline: {
          bg: 'transparent',
          color: colors.text.primary,
          borderColor: colors.surface.lineStrong,
          _hover: { borderColor: colors.accent.signal, bg: colors.accent.signalAlpha[8] },
        },
        ghost: {
          color: colors.text.secondary,
          _hover: { color: colors.text.primary, bg: 'rgba(255,255,255,0.04)' },
        },
      },
      defaultProps: { variant: 'solid', size: 'md' },
    },
    Heading: { baseStyle: { fontFamily: typography.fonts.heading, fontWeight: 600, letterSpacing: '-0.02em', textTransform: 'lowercase' } },
    Input: {
      variants: {
        naked: {
          field: {
            bg: colors.surface.raised,
            border: '1px solid',
            borderColor: colors.surface.line,
            borderRadius: '14px',
            color: colors.text.primary,
            fontFamily: typography.fonts.mono,
            _placeholder: { color: colors.text.muted },
            _focus: { borderColor: colors.accent.signal, boxShadow: 'none' },
          },
        },
      },
      defaultProps: { variant: 'naked' },
    },
  },
});

export default theme;
