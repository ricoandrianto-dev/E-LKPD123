export const state = {
  screen: "login",
  groupId: null,
  memberId: null,
  currentPhase: 1,
  timerInterval: null,
  unsubscribers: [],
  data: { groups: {}, questions: {}, settings: {}, students: {}, bank: {} }
};

export function clearSubscriptions() {
  for (const unsub of state.unsubscribers) {
    try { unsub(); } catch (_) {}
  }
  state.unsubscribers = [];
}

export function addSubscription(unsub) {
  if (typeof unsub === "function") state.unsubscribers.push(unsub);
}
