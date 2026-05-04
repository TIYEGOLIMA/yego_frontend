import type { WorkosMeetingItemStatus } from '../../types'

export type ActaNewRowDraft = {
  areaId: number | undefined
  responsibleUserId: number | undefined
  areaNameSnapshot: string
  situation: string
  taskTitle: string
  responsibleNameSnapshot: string
  startDate: string
  deadline: string
  status: WorkosMeetingItemStatus
}

export type LocalActaDraftRow = ActaNewRowDraft & { tempId: string }

export function meetingMinuteDraftNewRowIsEmpty(d: ActaNewRowDraft): boolean {
  return (
    !d.areaNameSnapshot.trim() &&
    !d.situation.trim() &&
    !d.taskTitle.trim() &&
    !d.responsibleNameSnapshot.trim() &&
    !d.startDate.trim() &&
    !d.deadline.trim() &&
    d.areaId == null &&
    d.responsibleUserId == null
  )
}

export function stickyResetActaNewRowKeepTeam(prev: ActaNewRowDraft): ActaNewRowDraft {
  return {
    areaId: prev.areaId,
    areaNameSnapshot: prev.areaNameSnapshot,
    responsibleUserId: prev.responsibleUserId,
    responsibleNameSnapshot: prev.responsibleNameSnapshot,
    situation: '',
    taskTitle: '',
    startDate: '',
    deadline: '',
    status: 'PENDIENTE',
  }
}
