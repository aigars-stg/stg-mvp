/**
 * Icon barrel file — re-exports Phosphor Icons under griddy-icons names.
 *
 * Components import from '@/lib/icons' using the old griddy names. This file
 * maps each name to the corresponding Phosphor icon so we can swap the
 * underlying library without touching JSX across 162 files.
 *
 * Phosphor uses the `*Icon` suffix as the preferred export (e.g. HeartIcon).
 * We import those and re-export under the griddy alias.
 */

// ─── Direct matches (griddy name = Phosphor name) ───────────────────────────
export { ArchiveIcon as Archive } from '@phosphor-icons/react/ssr';
export { ArrowDownIcon as ArrowDown } from '@phosphor-icons/react/ssr';
export { ArrowDownRightIcon as ArrowDownRight } from '@phosphor-icons/react/ssr';
export { ArrowLeftIcon as ArrowLeft } from '@phosphor-icons/react/ssr';
export { ArrowRightIcon as ArrowRight } from '@phosphor-icons/react/ssr';
export { ArrowUpIcon as ArrowUp } from '@phosphor-icons/react/ssr';
export { ArrowUpRightIcon as ArrowUpRight } from '@phosphor-icons/react/ssr';
export { AtIcon as At } from '@phosphor-icons/react/ssr';
export { BookOpenIcon as BookOpen } from '@phosphor-icons/react/ssr';
export { BriefcaseIcon as Briefcase } from '@phosphor-icons/react/ssr';
export { BugIcon as Bug } from '@phosphor-icons/react/ssr';
export { CalculatorIcon as Calculator } from '@phosphor-icons/react/ssr';
export { CalendarIcon as Calendar } from '@phosphor-icons/react/ssr';
export { ChartBarIcon as ChartBar } from '@phosphor-icons/react/ssr';
export { ChatIcon as Chat } from '@phosphor-icons/react/ssr';
export { CheckIcon as Check } from '@phosphor-icons/react/ssr';
export { CheckerboardIcon as Checkerboard } from '@phosphor-icons/react/ssr';
export { CheckCircleIcon as CheckCircle } from '@phosphor-icons/react/ssr';
export { CoinsIcon as Coins } from '@phosphor-icons/react/ssr';
export { CopyIcon as Copy } from '@phosphor-icons/react/ssr';
export { CreditCardIcon as CreditCard } from '@phosphor-icons/react/ssr';
export { CurrencyDollarIcon as CurrencyDollar } from '@phosphor-icons/react/ssr';
export { DownloadIcon as Download } from '@phosphor-icons/react/ssr';
export { EyeIcon as Eye } from '@phosphor-icons/react/ssr';
export { FileTextIcon as FileText } from '@phosphor-icons/react/ssr';
export { GlobeIcon as Globe } from '@phosphor-icons/react/ssr';
export { HandDepositIcon as HandDeposit } from '@phosphor-icons/react/ssr';
export { HeartIcon as Heart } from '@phosphor-icons/react/ssr';
export { LayoutIcon as Layout } from '@phosphor-icons/react/ssr';
export { LockIcon as Lock } from '@phosphor-icons/react/ssr';
export { MinusIcon as Minus } from '@phosphor-icons/react/ssr';
export { MonitorIcon as Monitor } from '@phosphor-icons/react/ssr';
export { PackageIcon as Package } from '@phosphor-icons/react/ssr';
export { PhoneIcon as Phone } from '@phosphor-icons/react/ssr';
export { PlusIcon as Plus } from '@phosphor-icons/react/ssr';
export { PuzzlePieceIcon as PuzzlePiece } from '@phosphor-icons/react/ssr';
export { ReceiptIcon as Receipt } from '@phosphor-icons/react/ssr';
export { ShieldIcon as Shield } from '@phosphor-icons/react/ssr';
export { ShieldCheckIcon as ShieldCheck } from '@phosphor-icons/react/ssr';
export { StarIcon as Star } from '@phosphor-icons/react/ssr';
export { TagIcon as Tag } from '@phosphor-icons/react/ssr';
export { TimerIcon as Timer } from '@phosphor-icons/react/ssr';
export { TrendUpIcon as TrendUp } from '@phosphor-icons/react/ssr';
export { TrophyIcon as Trophy } from '@phosphor-icons/react/ssr';
export { TruckIcon as Truck } from '@phosphor-icons/react/ssr';
export { UserIcon as User } from '@phosphor-icons/react/ssr';
export { UsersIcon as Users } from '@phosphor-icons/react/ssr';
export { XIcon as X } from '@phosphor-icons/react/ssr';

// ─── Renamed icons (griddy name ≠ Phosphor name) ────────────────────────────
export { WarningCircleIcon as AlertCircle } from '@phosphor-icons/react/ssr';
export { WarningIcon as AlertTriangle } from '@phosphor-icons/react/ssr';
export { FlaskIcon as Beaker } from '@phosphor-icons/react/ssr';
export { BuildingsIcon as Building } from '@phosphor-icons/react/ssr';
export { CalendarDotsIcon as CalendarTime } from '@phosphor-icons/react/ssr';
export { ChatCircleIcon as ChatBubble } from '@phosphor-icons/react/ssr';
export { ChatCircleDotsIcon as ChatBubbleDots } from '@phosphor-icons/react/ssr';
export { CheckCircleIcon as CheckCircleAlt01 } from '@phosphor-icons/react/ssr';
export { CaretDownIcon as ChevronDown } from '@phosphor-icons/react/ssr';
export { CaretLeftIcon as ChevronLeft } from '@phosphor-icons/react/ssr';
export { CaretRightIcon as ChevronRight } from '@phosphor-icons/react/ssr';
export { CaretUpIcon as ChevronUp } from '@phosphor-icons/react/ssr';
export { ClipboardTextIcon as ClipboardCheck } from '@phosphor-icons/react/ssr';
export { ClipboardTextIcon as ClipboardList } from '@phosphor-icons/react/ssr';
export { XIcon as Close } from '@phosphor-icons/react/ssr';
export { XCircleIcon as CloseCircle } from '@phosphor-icons/react/ssr';
export { CurrencyEurIcon as CurrencyEuro } from '@phosphor-icons/react/ssr';
export { TruckIcon as Delivery } from '@phosphor-icons/react/ssr';
export { PencilSimpleIcon as Edit } from '@phosphor-icons/react/ssr';
export { EnvelopeIcon as Email } from '@phosphor-icons/react/ssr';
export { EyeSlashIcon as EyeOff } from '@phosphor-icons/react/ssr';
export { FunnelIcon as Filter } from '@phosphor-icons/react/ssr';
export { LightningIcon as Flash } from '@phosphor-icons/react/ssr';
export { SquaresFourIcon as Grid } from '@phosphor-icons/react/ssr';
export { QuestionIcon as HelpCircle } from '@phosphor-icons/react/ssr';
export { HouseIcon as Home } from '@phosphor-icons/react/ssr';
export { ImageIcon as ImagePlus } from '@phosphor-icons/react/ssr';
export { InfoIcon as InfoCircle } from '@phosphor-icons/react/ssr';
export { LightbulbIcon as LightbulbOn } from '@phosphor-icons/react/ssr';
export { ArrowSquareOutIcon as LinkExternal } from '@phosphor-icons/react/ssr';
export { ListIcon as ListBulleted } from '@phosphor-icons/react/ssr';
export { CrosshairIcon as LocationMy } from '@phosphor-icons/react/ssr';
export { MapPinIcon as LocationPin } from '@phosphor-icons/react/ssr';
export { SignInIcon as LogIn } from '@phosphor-icons/react/ssr';
export { SignOutIcon as LogOut } from '@phosphor-icons/react/ssr';
export { MapTrifoldIcon as Map } from '@phosphor-icons/react/ssr';
export { ArrowsOutIcon as Maximize } from '@phosphor-icons/react/ssr';
export { DotsThreeVerticalIcon as MoreVertical } from '@phosphor-icons/react/ssr';
export { BellIcon as Notification } from '@phosphor-icons/react/ssr';
export { CameraIcon as PhotoCamera } from '@phosphor-icons/react/ssr';
export { ArrowsClockwiseIcon as RefreshCw } from '@phosphor-icons/react/ssr';
export { ScalesIcon as Scale } from '@phosphor-icons/react/ssr';
export { MagnifyingGlassIcon as Search } from '@phosphor-icons/react/ssr';
export { MagnifyingGlassMinusIcon as SearchMinus } from '@phosphor-icons/react/ssr';
export { MagnifyingGlassPlusIcon as SearchPlus } from '@phosphor-icons/react/ssr';
export { PaperPlaneTiltIcon as Send } from '@phosphor-icons/react/ssr';
export { GearIcon as Settings } from '@phosphor-icons/react/ssr';
export { SlidersHorizontalIcon as SettingsAdjustHorizontal } from '@phosphor-icons/react/ssr';
export { BagIcon as ShoppingBag } from '@phosphor-icons/react/ssr';
export { ShoppingCartIcon as ShoppingBasket } from '@phosphor-icons/react/ssr';
export { SparkleIcon as Sparks } from '@phosphor-icons/react/ssr';
export { StorefrontIcon as Store } from '@phosphor-icons/react/ssr';
export { DeviceTabletIcon as Tablet } from '@phosphor-icons/react/ssr';
export { TextAaIcon as TextFont } from '@phosphor-icons/react/ssr';
export { ClockIcon as Time } from '@phosphor-icons/react/ssr';
export { WrenchIcon as Tool } from '@phosphor-icons/react/ssr';
export { TrashIcon as TrashAlt } from '@phosphor-icons/react/ssr';
export { ArrowCounterClockwiseIcon as Undo } from '@phosphor-icons/react/ssr';
export { WifiHighIcon as Wifi } from '@phosphor-icons/react/ssr';
export { WifiSlashIcon as WifiOff } from '@phosphor-icons/react/ssr';

// ─── Phosphor-native icons (no griddy equivalent) ───────────────────────────
export { CookieIcon as Cookie } from '@phosphor-icons/react/ssr';
export { GavelIcon as Gavel } from '@phosphor-icons/react/ssr';
export { HandshakeIcon as Handshake } from '@phosphor-icons/react/ssr';
export { HandWavingIcon as HandWaving } from '@phosphor-icons/react/ssr';
export { WalletIcon as Wallet } from '@phosphor-icons/react/ssr';
export { ChatTextIcon as ChatText } from '@phosphor-icons/react/ssr';
