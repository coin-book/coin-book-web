<script lang="ts">
  import type { Component } from 'svelte';
  import Airplane from 'phosphor-svelte/lib/AirplaneIcon';
  import ArrowDownLeft from 'phosphor-svelte/lib/ArrowDownLeftIcon';
  import ArrowsLeftRight from 'phosphor-svelte/lib/ArrowsLeftRightIcon';
  import Baby from 'phosphor-svelte/lib/BabyIcon';
  import Bank from 'phosphor-svelte/lib/BankIcon';
  import Barbell from 'phosphor-svelte/lib/BarbellIcon';
  import Bicycle from 'phosphor-svelte/lib/BicycleIcon';
  import BookOpen from 'phosphor-svelte/lib/BookOpenIcon';
  import Briefcase from 'phosphor-svelte/lib/BriefcaseIcon';
  import Bus from 'phosphor-svelte/lib/BusIcon';
  import Car from 'phosphor-svelte/lib/CarIcon';
  import CaretLeft from 'phosphor-svelte/lib/CaretLeftIcon';
  import CaretRight from 'phosphor-svelte/lib/CaretRightIcon';
  import Check from 'phosphor-svelte/lib/CheckIcon';
  import CheckCircle from 'phosphor-svelte/lib/CheckCircleIcon';
  import Coffee from 'phosphor-svelte/lib/CoffeeIcon';
  import Copy from 'phosphor-svelte/lib/CopyIcon';
  import DeviceMobile from 'phosphor-svelte/lib/DeviceMobileIcon';
  import Dog from 'phosphor-svelte/lib/DogIcon';
  import DotsThree from 'phosphor-svelte/lib/DotsThreeIcon';
  import DownloadSimple from 'phosphor-svelte/lib/DownloadSimpleIcon';
  import FilmSlate from 'phosphor-svelte/lib/FilmSlateIcon';
  import FirstAid from 'phosphor-svelte/lib/FirstAidIcon';
  import ForkKnife from 'phosphor-svelte/lib/ForkKnifeIcon';
  import GameController from 'phosphor-svelte/lib/GameControllerIcon';
  import GasPump from 'phosphor-svelte/lib/GasPumpIcon';
  import Gear from 'phosphor-svelte/lib/GearIcon';
  import GoogleLogo from 'phosphor-svelte/lib/GoogleLogoIcon';
  import Gift from 'phosphor-svelte/lib/GiftIcon';
  import GitMerge from 'phosphor-svelte/lib/GitMergeIcon';
  import GraduationCap from 'phosphor-svelte/lib/GraduationCapIcon';
  import HandHeart from 'phosphor-svelte/lib/HandHeartIcon';
  import Heartbeat from 'phosphor-svelte/lib/HeartbeatIcon';
  import House from 'phosphor-svelte/lib/HouseIcon';
  import Keyboard from 'phosphor-svelte/lib/KeyboardIcon';
  import Lightning from 'phosphor-svelte/lib/LightningIcon';
  import ListBullets from 'phosphor-svelte/lib/ListBulletsIcon';
  import MagnifyingGlass from 'phosphor-svelte/lib/MagnifyingGlassIcon';
  import Money from 'phosphor-svelte/lib/MoneyIcon';
  import MusicNotes from 'phosphor-svelte/lib/MusicNotesIcon';
  import Palette from 'phosphor-svelte/lib/PaletteIcon';
  import PawPrint from 'phosphor-svelte/lib/PawPrintIcon';
  import PencilSimple from 'phosphor-svelte/lib/PencilSimpleIcon';
  import PiggyBank from 'phosphor-svelte/lib/PiggyBankIcon';
  import Pill from 'phosphor-svelte/lib/PillIcon';
  import Plus from 'phosphor-svelte/lib/PlusIcon';
  import Question from 'phosphor-svelte/lib/QuestionIcon';
  import Receipt from 'phosphor-svelte/lib/ReceiptIcon';
  import Robot from 'phosphor-svelte/lib/RobotIcon';
  import ShoppingBag from 'phosphor-svelte/lib/ShoppingBagIcon';
  import ShoppingCart from 'phosphor-svelte/lib/ShoppingCartIcon';
  import SignOut from 'phosphor-svelte/lib/SignOutIcon';
  import Sparkle from 'phosphor-svelte/lib/SparkleIcon';
  import SquaresFour from 'phosphor-svelte/lib/SquaresFourIcon';
  import TShirt from 'phosphor-svelte/lib/TShirtIcon';
  import Tag from 'phosphor-svelte/lib/TagIcon';
  import Target from 'phosphor-svelte/lib/TargetIcon';
  import Television from 'phosphor-svelte/lib/TelevisionIcon';
  import Ticket from 'phosphor-svelte/lib/TicketIcon';
  import Train from 'phosphor-svelte/lib/TrainIcon';
  import Trash from 'phosphor-svelte/lib/TrashIcon';
  import Tray from 'phosphor-svelte/lib/TrayIcon';
  import Tree from 'phosphor-svelte/lib/TreeIcon';
  import UploadSimple from 'phosphor-svelte/lib/UploadSimpleIcon';
  import Warning from 'phosphor-svelte/lib/WarningIcon';
  import Wine from 'phosphor-svelte/lib/WineIcon';
  import Wrench from 'phosphor-svelte/lib/WrenchIcon';
  import X from 'phosphor-svelte/lib/XIcon';

  // Names are category.icon values: seeded by coin-book-api/db/migration/002_default_taxonomy.up.sql or chosen in CategoryAppearance.
  const icons: Record<string, Component<any>> = {
    airplane: Airplane,
    'arrow-down-left': ArrowDownLeft,
    'arrows-left-right': ArrowsLeftRight,
    baby: Baby,
    bank: Bank,
    barbell: Barbell,
    bicycle: Bicycle,
    'book-open': BookOpen,
    briefcase: Briefcase,
    bus: Bus,
    car: Car,
    'caret-left': CaretLeft,
    'caret-right': CaretRight,
    check: Check,
    'check-circle': CheckCircle,
    coffee: Coffee,
    copy: Copy,
    'device-mobile': DeviceMobile,
    dog: Dog,
    'dots-three': DotsThree,
    'download-simple': DownloadSimple,
    'film-slate': FilmSlate,
    'first-aid': FirstAid,
    'fork-knife': ForkKnife,
    'game-controller': GameController,
    'gas-pump': GasPump,
    gear: Gear,
    'google-logo': GoogleLogo,
    gift: Gift,
    'git-merge': GitMerge,
    'graduation-cap': GraduationCap,
    'hand-heart': HandHeart,
    heartbeat: Heartbeat,
    house: House,
    keyboard: Keyboard,
    lightning: Lightning,
    'list-bullets': ListBullets,
    'magnifying-glass': MagnifyingGlass,
    money: Money,
    'music-notes': MusicNotes,
    palette: Palette,
    'paw-print': PawPrint,
    'pencil-simple': PencilSimple,
    'piggy-bank': PiggyBank,
    pill: Pill,
    plus: Plus,
    question: Question,
    receipt: Receipt,
    robot: Robot,
    'shopping-bag': ShoppingBag,
    'shopping-cart': ShoppingCart,
    'sign-out': SignOut,
    sparkle: Sparkle,
    'squares-four': SquaresFour,
    't-shirt': TShirt,
    tag: Tag,
    target: Target,
    television: Television,
    ticket: Ticket,
    train: Train,
    trash: Trash,
    tray: Tray,
    tree: Tree,
    'upload-simple': UploadSimple,
    warning: Warning,
    wine: Wine,
    wrench: Wrench,
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
