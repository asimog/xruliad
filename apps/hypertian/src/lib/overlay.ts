import { z } from 'zod';
import { AdPosition, AdSize, OverlayAdConfig, OverlayTheme, SupportedChain } from '@/lib/types';

const positionSchema = z.enum(['bottom-right']);
const sizeSchema = z.enum(['small', 'medium', 'large']);
const themeSchema = z.enum(['dark', 'light']);
const chainSchema = z.enum(['solana', 'ethereum', 'base', 'bsc', 'arbitrum', 'polygon']);

function getAll(searchParams: URLSearchParams, key: string) {
  const direct = searchParams.getAll(key);
  if (direct.length && !direct[0]?.includes(',')) {
    return direct;
  }
  const csv = direct[0] || searchParams.get(key);
  return csv ? csv.split(',').map((value) => value.trim()).filter(Boolean) : [];
}

export function parseOverlayConfigs(searchParams: URLSearchParams): OverlayAdConfig[] {
  const tokens = getAll(searchParams, 'token');
  const chains = getAll(searchParams, 'chain');
  const positions = getAll(searchParams, 'position');
  const sizes = getAll(searchParams, 'size');
  const themes = getAll(searchParams, 'theme');
  const sponsors = getAll(searchParams, 'show_sponsor');
  const labels = getAll(searchParams, 'sponsor_label');

  return tokens.map((token, index) => ({
    token,
    chain: chainSchema.catch('solana').parse(chains[index] || chains[0] || 'solana') as SupportedChain,
    position: positionSchema.catch('bottom-right').parse(positions[index] || positions[0] || 'bottom-right') as AdPosition,
    size: sizeSchema.catch('medium').parse(sizes[index] || sizes[0] || 'medium') as AdSize,
    theme: themeSchema.catch('dark').parse(themes[index] || themes[0] || 'dark') as OverlayTheme,
    showSponsor: ['1', 'true', 'yes'].includes((sponsors[index] || sponsors[0] || '').toLowerCase()),
    sponsorLabel: labels[index] || labels[0] || null,
  }));
}
