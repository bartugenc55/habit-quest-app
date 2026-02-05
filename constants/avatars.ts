// ─── Avatar Catalog: single source of truth ───

export type AvatarRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface AvatarDef {
  id: string;
  name: string;
  icon: string;
  rarity: AvatarRarity;
  /** XP price in shop — null means not purchasable */
  price: number | null;
  /** Level at which this avatar is auto-unlocked — null means shop-only */
  unlockLevel: number | null;
  description: string;
}

// ─── Rarity visual config ───

export const RARITY_COLORS: Record<AvatarRarity, { bg: string; text: string; glow: string; label: string }> = {
  common:    { bg: '#8e8e93', text: '#ffffff', glow: 'transparent', label: 'Sıradan' },
  rare:      { bg: '#3498db', text: '#ffffff', glow: '#3498db',     label: 'Nadir' },
  epic:      { bg: '#9b59b6', text: '#ffffff', glow: '#9b59b6',     label: 'Epik' },
  legendary: { bg: '#f39c12', text: '#1a1a2e', glow: '#f39c12',     label: 'Efsanevi' },
};

// ─── Full avatar catalog ───

export const avatarCatalog: AvatarDef[] = [
  // Level-unlocked avatars
  {
    id: 'avatar_starter',
    name: 'Çırak',
    icon: '🧙‍♂️',
    rarity: 'common',
    price: null,
    unlockLevel: 1,
    description: 'Her yolculuk bir adımla başlar.',
  },
  {
    id: 'avatar_warrior',
    name: 'Savaşçı',
    icon: '⚔️',
    rarity: 'common',
    price: null,
    unlockLevel: 5,
    description: 'Disiplinin gücünü keşfettin.',
  },
  {
    id: 'avatar_mage',
    name: 'Büyücü',
    icon: '🔮',
    rarity: 'rare',
    price: null,
    unlockLevel: 10,
    description: 'Alışkanlıkların büyüsüne hakim oldun.',
  },
  {
    id: 'avatar_dragon',
    name: 'Ejderha',
    icon: '🐉',
    rarity: 'legendary',
    price: null,
    unlockLevel: 20,
    description: 'Efsanelerin arasına katıldın.',
  },

  // Shop-purchasable avatars
  {
    id: 'avatar_ninja',
    name: 'Ninja',
    icon: '🥷',
    rarity: 'rare',
    price: 150,
    unlockLevel: null,
    description: 'Gizli ve hızlı ninja avatarı.',
  },
  {
    id: 'avatar_alien',
    name: 'Uzaylı',
    icon: '👽',
    rarity: 'epic',
    price: 200,
    unlockLevel: null,
    description: 'Galaksiler arası gezgin.',
  },
  {
    id: 'avatar_robot',
    name: 'Robot',
    icon: '🤖',
    rarity: 'epic',
    price: 200,
    unlockLevel: null,
    description: 'Mekanik güç avatarı.',
  },
  {
    id: 'avatar_pirate',
    name: 'Korsan',
    icon: '🏴‍☠️',
    rarity: 'legendary',
    price: 250,
    unlockLevel: null,
    description: 'Denizlerin hakimi.',
  },
];

// ─── Helpers ───

/** Look up a single avatar definition by ID. */
export function getAvatarDef(avatarId: string): AvatarDef | undefined {
  return avatarCatalog.find((a) => a.id === avatarId);
}

/** Get all avatars that should be unlocked at a given level or below. */
export function getAvatarsForLevel(level: number): AvatarDef[] {
  return avatarCatalog.filter((a) => a.unlockLevel !== null && a.unlockLevel <= level);
}

/** Get only the shop-purchasable avatars. */
export function getShopAvatars(): AvatarDef[] {
  return avatarCatalog.filter((a) => a.price !== null);
}
