import { useNavigate } from 'react-router-dom'
import Countdown from './Countdown'

interface TaskData {
  id: string
  title: string
  description: string
  reward: number | string
  category: string
  status: string
  maxWorkers: number
  currentWorkers: number
  submissionsCount?: number
  minSorsaScore?: number
  requiresLinkedin?: boolean
  requiresWallet?: boolean
  deadlineHours?: number | null
  createdAt: string
  rank?: string | number
  poster?: {
    id: string
    username?: string
    avatarUrl?: string | null
    createdAt?: string
    posterProfile?: {
      avgRating?: number
      isVerified?: boolean
      totalPosted?: number
    }
  }
  _count?: {
    submissions: number
  }
}

interface TaskCardProps {
  task: TaskData
}

export default function TaskCard({ task }: TaskCardProps) {
  const navigate = useNavigate()

  const isCoolingDown = task.status === 'COOLING_DOWN'
  const filledSlots = task.currentWorkers || 0
  const totalSlots = task.maxWorkers || 1
  const openSlots = totalSlots - filledSlots
  const progressPercent = Math.min(Math.round((filledSlots / totalSlots) * 100), 100)
  const submissionsCount = task.submissionsCount ?? task._count?.submissions ?? 0
  const isNew = Date.now() - new Date(task.createdAt).getTime() < 86400000
  const posterName = task.poster?.username || 'Anonymous'

  return (
    <div
      onClick={() => navigate(`/tasks/${task.id}`)}
      className="rounded-2xl border border-gray-200 bg-white flex flex-col overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
    >
      {/* Header — poster info */}
      <div className="flex items-center gap-3 p-4 pb-3 bg-gradient-to-r from-blue-50 to-white">
        <img
          src={task.poster?.avatarUrl || '/default-avatar.png'}
          className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
        />
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest leading-none">
            Listed by
          </p>
          <p className="font-black text-gray-900 text-sm tracking-wide uppercase">
            {posterName}
          </p>
        </div>
        {isNew && (
          <span className="ml-auto bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            NEW
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3 p-4">
        {/* Progress */}
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1.5">
            <span className="uppercase tracking-widest">Progress</span>
            <span className="font-semibold text-gray-700">
              {filledSlots}/{totalSlots === 999 ? '\u221E' : totalSlots}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${isCoolingDown ? 'bg-orange-400' : 'bg-blue-500'}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {/* Status row */}
          <div className="flex items-center gap-3 text-xs mt-2 flex-wrap">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span className="text-blue-500 font-medium">
                Submissions {submissionsCount}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-300" />
              <span className="text-blue-400">
                {totalSlots === 999 ? 'Unlimited slots' : `Open ${openSlots}`}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <span
                className={`w-1.5 h-1.5 rounded-full ${isCoolingDown ? 'bg-orange-400' : 'bg-blue-500 animate-pulse'}`}
              />
              <span className={`font-medium ${isCoolingDown ? 'text-orange-500' : 'text-blue-500'}`}>
                {isCoolingDown ? 'Cooling Down' : 'Status Open'}
              </span>
            </span>
          </div>
        </div>

        {/* Reward box */}
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-blue-600">
              {Number(task.reward).toLocaleString()}
            </span>
            <span className="text-sm font-bold text-blue-400">NGN</span>
          </div>
          <p className="text-xs text-gray-400 uppercase tracking-widest mt-0.5">
            Reward / Slot
          </p>
        </div>

        {/* Category + rank + requirements */}
        <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
          <span>{task.category}</span>
          {task.rank && (
            <>
              <span className="text-gray-200">|</span>
              <span>Rank {task.rank}</span>
            </>
          )}
          {task.minSorsaScore && task.minSorsaScore > 0 && (
            <>
              <span className="text-gray-200">|</span>
              <span>Req: Sorsa {task.minSorsaScore}+</span>
            </>
          )}
          {task.requiresLinkedin && (
            <>
              <span className="text-gray-200">|</span>
              <span>Req: LinkedIn</span>
            </>
          )}
          {task.requiresWallet && (
            <>
              <span className="text-gray-200">|</span>
              <span>Req: Wallet</span>
            </>
          )}
        </div>

        {/* About + countdown */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <i className="ti ti-message-square text-gray-400" style={{ fontSize: 12 }} />
              <span className="uppercase tracking-widest">About This Task</span>
            </div>
            <Countdown
              startDate={task.createdAt}
              deadlineHours={task.deadlineHours}
            />
          </div>
          <p className="text-sm text-gray-600 line-clamp-3">
            {task.description}
          </p>
        </div>
      </div>
    </div>
  )
}
