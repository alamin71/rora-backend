export enum CALL_STATUS {
  REQUESTED = 'requested',
  ASSIGNED = 'assigned',
  DIALING_CUSTOMER = 'dialing_customer',
  CUSTOMER_CONNECTED = 'customer_connected',
  DIALING_DESTINATION = 'dialing_destination',
  DESTINATION_CONNECTED = 'destination_connected',
  CONFERENCING = 'conferencing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum CALL_FAILURE_REASON {
  CUSTOMER_NO_ANSWER = 'customer_no_answer',
  DESTINATION_NO_ANSWER = 'destination_no_answer',
  INVALID_NUMBER = 'invalid_number',
  LINE_BUSY = 'line_busy',
  NETWORK_ISSUE = 'network_issue',
  OTHER = 'other',
}
