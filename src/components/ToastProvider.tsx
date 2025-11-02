import { Toaster } from 'react-hot-toast'

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      toastOptions={{
        // Default options
        duration: 4000,
        style: {
          background: '#2a2a2a',
          color: '#fff',
          border: '1px solid #3a3a3a',
          borderRadius: '8px',
          fontSize: '14px',
          padding: '12px 16px',
        },
        // Success toast
        success: {
          duration: 3000,
          iconTheme: {
            primary: '#4ade80',
            secondary: '#fff',
          },
          style: {
            background: '#1a2a1a',
            border: '1px solid #4ade80',
          },
        },
        // Error toast
        error: {
          duration: 5000,
          iconTheme: {
            primary: '#f87171',
            secondary: '#fff',
          },
          style: {
            background: '#2a1a1a',
            border: '1px solid #f87171',
          },
        },
        // Loading toast
        loading: {
          style: {
            background: '#1a1a2a',
            border: '1px solid #4a9eff',
          },
        },
      }}
    />
  )
}
