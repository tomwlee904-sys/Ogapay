import "./PageLoader.css"

interface PageLoaderProps {
  label?: string
}

export default function PageLoader({ label = "Loading OgaPay..." }: PageLoaderProps) {
  return (
    <div className="oga-page-loader">
      <div className="oga-spinner-wrap">
        <div className="oga-spinner-ring" />
        <div className="oga-spinner-logo">
          <svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="98" y="98" width="107" height="107" rx="20" fill="white" />
            <path d="M225 98H312C323 98 332 107 332 118V205H225V98Z" fill="white" />
            <path d="M352 98H392C440 98 470 128 470 176V205H352V98Z" fill="white" />
            <rect x="98" y="225" width="107" height="107" fill="white" />
            <rect x="225" y="225" width="107" height="107" fill="white" />
            <path d="M352 225H470V254C470 302 440 332 392 332H352V225Z" fill="white" />
            <rect x="98" y="352" width="107" height="107" rx="20" fill="white" />
            <path d="M225 352H312C323 352 332 361 332 372V439C332 450 323 459 312 459H225V352Z" fill="white" />
          </svg>
        </div>
      </div>
      <div className="oga-loader-text">{label}</div>
    </div>
  )
}
