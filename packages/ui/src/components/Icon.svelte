<script lang="ts">
  import type { Component } from 'svelte';
  import ArrowDownLeft from 'phosphor-svelte/lib/ArrowDownLeftIcon';
  import ArrowsLeftRight from 'phosphor-svelte/lib/ArrowsLeftRightIcon';
  import Baby from 'phosphor-svelte/lib/BabyIcon';
  import Bank from 'phosphor-svelte/lib/BankIcon';
  import Car from 'phosphor-svelte/lib/CarIcon';
  import CaretLeft from 'phosphor-svelte/lib/CaretLeftIcon';
  import CaretRight from 'phosphor-svelte/lib/CaretRightIcon';
  import Check from 'phosphor-svelte/lib/CheckIcon';
  import CheckCircle from 'phosphor-svelte/lib/CheckCircleIcon';
  import Copy from 'phosphor-svelte/lib/CopyIcon';
  import DotsThree from 'phosphor-svelte/lib/DotsThreeIcon';
  import ForkKnife from 'phosphor-svelte/lib/ForkKnifeIcon';
  import Gear from 'phosphor-svelte/lib/GearIcon';
  import Heartbeat from 'phosphor-svelte/lib/HeartbeatIcon';
  import House from 'phosphor-svelte/lib/HouseIcon';
  import Keyboard from 'phosphor-svelte/lib/KeyboardIcon';
  import ListBullets from 'phosphor-svelte/lib/ListBulletsIcon';
  import MagnifyingGlass from 'phosphor-svelte/lib/MagnifyingGlassIcon';
  import PiggyBank from 'phosphor-svelte/lib/PiggyBankIcon';
  import Question from 'phosphor-svelte/lib/QuestionIcon';
  import Receipt from 'phosphor-svelte/lib/ReceiptIcon';
  import Robot from 'phosphor-svelte/lib/RobotIcon';
  import ShoppingBag from 'phosphor-svelte/lib/ShoppingBagIcon';
  import ShoppingCart from 'phosphor-svelte/lib/ShoppingCartIcon';
  import SignOut from 'phosphor-svelte/lib/SignOutIcon';
  import SquaresFour from 'phosphor-svelte/lib/SquaresFourIcon';
  import Tag from 'phosphor-svelte/lib/TagIcon';
  import Target from 'phosphor-svelte/lib/TargetIcon';
  import Ticket from 'phosphor-svelte/lib/TicketIcon';
  import Trash from 'phosphor-svelte/lib/TrashIcon';
  import Tray from 'phosphor-svelte/lib/TrayIcon';
  import UploadSimple from 'phosphor-svelte/lib/UploadSimpleIcon';
  import Warning from 'phosphor-svelte/lib/WarningIcon';
  import X from 'phosphor-svelte/lib/XIcon';

  // Names match category.icon values seeded in coin-book-api/db/migration/002_default_taxonomy.up.sql.
  const icons: Record<string, Component<any>> = {
    'arrow-down-left': ArrowDownLeft,
    'arrows-left-right': ArrowsLeftRight,
    baby: Baby,
    bank: Bank,
    car: Car,
    'caret-left': CaretLeft,
    'caret-right': CaretRight,
    check: Check,
    'check-circle': CheckCircle,
    copy: Copy,
    'dots-three': DotsThree,
    'fork-knife': ForkKnife,
    gear: Gear,
    heartbeat: Heartbeat,
    house: House,
    keyboard: Keyboard,
    'list-bullets': ListBullets,
    'magnifying-glass': MagnifyingGlass,
    'piggy-bank': PiggyBank,
    question: Question,
    receipt: Receipt,
    robot: Robot,
    'shopping-bag': ShoppingBag,
    'shopping-cart': ShoppingCart,
    'sign-out': SignOut,
    'squares-four': SquaresFour,
    tag: Tag,
    target: Target,
    ticket: Ticket,
    trash: Trash,
    tray: Tray,
    'upload-simple': UploadSimple,
    warning: Warning,
    x: X,
  };

  type Props = {
    name: string;
    size?: number | string;
    weight?: 'regular' | 'bold' | 'duotone' | 'fill';
    color?: string;
    class?: string;
  };

  let {
    name,
    size = 18,
    weight = 'regular',
    color = 'currentColor',
    class: className = '',
  }: Props = $props();

  const Glyph = $derived(icons[name] ?? Question);
</script>

<Glyph {size} {weight} {color} class={className} aria-hidden="true" />
