export type InvitationAvailabilityService = {
  ensureInvitationsSchemaIsReady(): Promise<string | null>;
};
