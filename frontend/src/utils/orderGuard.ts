export function getOrderGuardNoteHtml(error: any): string {
  return error?.response?.data?.orderGuard?.noteHtml || '';
}

export function isOrderGuardBlocked(error: any): boolean {
  return error?.response?.status === 429 && error?.response?.data?.code === 'ORDER_GUARD_BLOCKED';
}
