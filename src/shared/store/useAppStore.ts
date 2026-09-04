"use client";

import { create } from 'zustand';
import { ImmersiveSlice, createImmersiveSlice } from './slices/immersiveSlice';
import { PostComposerSlice, createPostComposerSlice } from './slices/postComposerSlice';
import { UserSettingsSlice, createUserSettingsSlice } from './slices/userSettingsSlice';
import { SocialFeedSlice, createSocialFeedSlice } from './slices/socialFeedSlice';
import { RealtimeSlice, createRealtimeSlice } from './slices/realtimeSlice';

export * from './slices/immersiveSlice';
export * from './slices/postComposerSlice';
export * from './slices/userSettingsSlice';
export * from './slices/socialFeedSlice';
export * from './slices/realtimeSlice';

export type AppState = ImmersiveSlice & PostComposerSlice & UserSettingsSlice & SocialFeedSlice & RealtimeSlice;

export const useAppStore = create<AppState>()((...a) => ({
  ...createImmersiveSlice(...a),
  ...createPostComposerSlice(...a),
  ...createUserSettingsSlice(...a),
  ...createSocialFeedSlice(...a),
  ...createRealtimeSlice(...a),
}));
