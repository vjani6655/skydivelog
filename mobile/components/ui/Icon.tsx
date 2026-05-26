import React from 'react';
import { Ionicons } from '@expo/vector-icons';

// Maps design-system icon names to Ionicons
const iconMap: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  log:              'book-outline',
  chart:            'bar-chart-outline',
  parachute:        'radio-button-off-outline',
  cert:             'ribbon-outline',
  user:             'person-outline',
  search:           'search-outline',
  filter:           'options-outline',
  plus:             'add-outline',
  back:             'arrow-back-outline',
  close:            'close-outline',
  check:            'checkmark-outline',
  chevron:          'chevron-forward-outline',
  down:             'chevron-down-outline',
  up:               'chevron-up-outline',
  star:             'star-outline',
  'star-fill':      'star',
  edit:             'create-outline',
  trash:            'trash-outline',
  plane:            'airplane-outline',
  map:              'map-outline',
  tag:              'pricetag-outline',
  qr:               'qr-code-outline',
  signature:        'pencil-outline',
  gear:             'settings-outline',
  bell:             'notifications-outline',
  export:           'download-outline',
  eye:              'eye-outline',
  clock:            'time-outline',
  calendar:         'calendar-outline',
  'arrow-up-right': 'arrow-up-circle-outline',
  dz:               'location-outline',
  altitude:         'trending-up-outline',
  shield:           'shield-checkmark-outline',
  menu:             'menu-outline',
  dots:             'ellipsis-horizontal',
  lock:             'lock-closed-outline',
  mail:             'mail-outline',
  card:             'card-outline',
  pie:              'pie-chart-outline',
  bar:              'bar-chart-outline',
  'wifi-off':       'wifi-outline',
  share:            'share-outline',
  pdf:              'document-text-outline',
};

interface IconProps {
  name: string;
  size?: number;
  color?: string;
}

export default function Icon({ name, size = 24, color }: IconProps) {
  const mapped = iconMap[name] ?? 'help-outline';
  return <Ionicons name={mapped} size={size} color={color} />;
}
