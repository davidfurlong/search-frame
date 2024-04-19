import { createFrames } from "frames.js/next";

export type SearchCasterCast = {
  body: {
    publishedAt: number;
    username: string;
    data: {
      text: string;
      // image: unknown;
      // embeds: unknown;
      replyParentMerkleRoot: string;
      threadMerkleRoot: string;
    };
  };
  meta: {
    displayName: string;
    avatar: string;
    isVerifiedAvatar: boolean;
    numReplyChildren: number;
    reactions: { count: number; type: "Like" };
    recasts: { count: number };
    watches: { count: number };
    replyParentUsername?: { fid: number; username: string };
    // mentions: unknown;
    // tags: unknown;
  };
  merkleRoot: string;
  uri: string;
};

type State = {
  counter: number;
  results: Record<string, SearchCasterCast>;
};

export const frames = createFrames<State>({
  basePath: "/frames",
  initialState: { counter: 1, results: {} },
});
