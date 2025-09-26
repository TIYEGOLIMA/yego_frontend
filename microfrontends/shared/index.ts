// 🌐 SHARED GLOBAL - Entry Point para todos los sistemas

// Constants y configuración global
export {
  GLOBAL_CONFIG,
  GLOBAL_THEME,
  AUTH_CONFIG,
  DEVICE_CONFIG,
  I18N_CONFIG
} from './utils/constants'

// Types globales
export type {
  BaseUser,
  AuthContext,
  DeviceInfo,
  ButtonVariant,
  ButtonSize,
  AlertType,
  LoadingState,
  OperationState,
  ApiResponse,
  PaginatedResponse,
  FilterOptions,
  FormField,
  SystemConfig
} from './types'

// Components globales
export {
  BaseButton,
  BaseLoader
} from './components'
