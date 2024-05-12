/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import { frames, SearchCasterCast } from "./frames";
import { LikeIcon, RecastIcon, ReplyIcon } from "./icons";
import * as fs from "node:fs/promises";
import * as path from "node:path";

function getTimer(name: string) {
  const dstart = new Date().getTime();

  return () => {
    const dend = new Date().getTime();

    const diffMs = dend - dstart;
    console.info(`timer ${name} measured ${diffMs} miliseconds`);
  };
}

const pageSize = 4;

export const runtime = "nodejs";

const interRegularFont = fs.readFile(
  path.join(path.resolve(process.cwd(), "public"), "Inter-Regular.ttf")
);

const interBoldFont = fs.readFile(
  path.join(path.resolve(process.cwd(), "public"), "Inter-Bold.ttf")
);

async function fetchSearchResult({
  q,
  count = pageSize,
  page = 0,
}: {
  q: string;
  count: number;
  page: number;
}) {
  try {
    const searchCasterTimer = getTimer("searchcaster");
    const res = await fetch(
      `https://searchcaster.xyz/api/search?text=${q}&count=${count}&page=${page}`
    );
    searchCasterTimer();
    const resJson = (await res.json()) as {
      casts: Array<SearchCasterCast>;
    };
    // convert array to record from the result index
    return resJson.casts.reduce(
      (
        prev: Record<string, SearchCasterCast>,
        next: SearchCasterCast,
        i: number
      ) => {
        return {
          ...prev,
          [count * page + i]: {
            merkleRoot: next.merkleRoot,
            meta: {
              displayName: next.meta.displayName,
              avatar: next.meta.avatar,
              recasts: { count: next.meta.recasts.count },
              reactions: { count: next.meta.reactions.count },
              numReplyChildren: next.meta.numReplyChildren,
              replyParentUsername: {
                username: next.meta.replyParentUsername?.username,
              },
            },
            body: {
              username: next.body.username,
              data: {
                text: next.body.data.text,
              },
            },
          },
        };
      },
      {}
    );
  } catch (err) {
    console.log("!!!");
    console.error(err);
    return {};
  }
}

const frameHandler = frames(async (ctx) => {
  try {
    const counter = ctx.message
      ? ctx.searchParams.op === "+"
        ? ctx.state.counter + 1
        : ctx.state.counter === 1
        ? ctx.state.counter
        : ctx.state.counter - 1
      : ctx.state.counter;

    const [interRegularFontData, interBoldFontData] = await Promise.all([
      interRegularFont,
      interBoldFont,
    ]);

    const query = ctx?.searchParams.query ?? "";
    const results = ctx.state.results;
    let newResults = results;
    if (!query) {
      // errorframe
      return {
        image: (
          <div tw="flex flex-col">
            <div tw="flex">
              Invalid. Empty query. Add a query parameter to the frame url
            </div>
          </div>
        ),
        accepts: [
          {
            id: "xmtp",
            version: "vNext",
          },
          {
            id: "farcaster",
            version: "vNext",
          },
        ],
        // initial frame can't have state
        ...(ctx.request.method === "POST"
          ? { state: { counter: counter, results: newResults } }
          : {}),
      };
    }
    if (!results[counter]) {
      newResults = await fetchSearchResult({
        q: query,
        page: Math.floor(counter / pageSize),
        count: pageSize,
      });
    }

    const currentResult = newResults[counter];
    if (!currentResult && counter === 1) {
      // errorframe
      return {
        image: (
          <div tw="flex flex-col">
            <div tw="flex">
              Couldn't find Farcaster casts that match "{query}"
            </div>
          </div>
        ),
        buttons: [
          <Button action="post" target={`?query=${query}`}>
            Retry
          </Button>,
        ],
        accepts: [
          {
            id: "xmtp",
            version: "vNext",
          },
          {
            id: "farcaster",
            version: "vNext",
          },
        ],
        // initial frame can't have state
        ...(ctx.request.method === "POST"
          ? { state: { counter: counter, results: newResults } }
          : {}),
      };
    }
    if (!currentResult && newResults.length) {
      // errorframe
      return {
        image: (
          <div tw="flex flex-col">
            <div tw="flex">No more results</div>
          </div>
        ),
        buttons: [
          <Button action="post" target={`?query=${query}`}>
            Retry
          </Button>,
        ],
        accepts: [
          {
            id: "xmtp",
            version: "vNext",
          },
          {
            id: "farcaster",
            version: "vNext",
          },
        ],
        // initial frame can't have state
        ...(ctx.request.method === "POST"
          ? { state: { counter: counter, results: newResults } }
          : {}),
      };
    }
    if (!currentResult) {
      // errorframe
      return {
        image: (
          <div tw="flex flex-col">
            <div tw="flex">Beep boop frame error</div>
          </div>
        ),
        buttons: [
          <Button
            action="post"
            target={{ pathname: "/", query: { op: "-", query: query } }}
          >
            Prev
          </Button>,
          <Button action="post" target={`?query=${query}`}>
            Retry
          </Button>,
        ],
        accepts: [
          {
            id: "xmtp",
            version: "vNext",
          },
          {
            id: "farcaster",
            version: "vNext",
          },
        ],
        // initial frame can't have state
        ...(ctx.request.method === "POST"
          ? { state: { counter: counter, results: newResults } }
          : {}),
      };
    }

    return {
      image: (
        <div tw="flex flex-col p-8 h-full w-full bg-slate-100">
          <div tw="flex text-slate-600 text-3xl">
            Searching Farcaster casts for "{query}"
          </div>
          <div tw="flex border border-slate-300 p-8 rounded-[20px] my-4 grow flex-col bg-white">
            {currentResult.meta.replyParentUsername?.username ? (
              <div tw="flex flex-row mb-6 text-3xl text-slate-500">
                Replying to{" "}
                <div tw="flex font-bold ml-2">
                  @{currentResult.meta.replyParentUsername?.username}
                </div>{" "}
              </div>
            ) : null}
            <div tw="flex flex-row">
              <div tw="w-1/6 flex">
                <img
                  src={currentResult.meta.avatar}
                  height="36px"
                  width="36px"
                  tw="w-36 h-36 rounded-full mr-6"
                />
              </div>
              <div tw="flex flex-col w-5/6">
                <div tw="flex flex-row">
                  <div tw="flex font-bold">
                    {currentResult.meta.displayName}
                  </div>{" "}
                  <div tw="flex ml-4">@{currentResult.body.username}</div>
                </div>
                <div tw="flex mt-2 w-full break-all text-3xl">
                  {currentResult.body.data.text}
                </div>
                <div tw="flex items-end text-slate-400 grow">
                  <div tw="flex mt-2 items-center text-slate-400">
                    <div tw="flex mr-4 items-center">
                      <div tw="flex w-10">
                        <LikeIcon />
                      </div>
                      <div tw="flex w-12">
                        {currentResult.meta.reactions.count}
                      </div>
                    </div>
                    <div tw="flex mr-4 items-center">
                      <div tw="flex w-10">
                        <RecastIcon />
                      </div>
                      <div tw="flex w-12">
                        {currentResult.meta.recasts.count}
                      </div>
                    </div>
                    <div tw="flex mr-4 items-center">
                      <div tw="flex w-10">
                        <ReplyIcon />
                      </div>
                      <div tw="flex w-12">
                        {currentResult.meta.numReplyChildren}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div tw="flex text-slate-600 text-3xl">
            Cast {counter} of{" "}
            {Object.keys(newResults).length >= pageSize
              ? "many"
              : Object.keys(newResults).length}
          </div>
        </div>
      ),
      imageOptions: {
        fonts: [
          {
            name: "Inter",
            data: interRegularFontData,
            weight: 400,
          },
          {
            name: "Inter",
            data: interBoldFontData,
            weight: 700,
          },
        ],
      },
      accepts: [
        {
          id: "xmtp",
          version: "vNext",
        },
        {
          id: "farcaster",
          version: "vNext",
        },
      ],
      buttons: [
        <Button
          action="post"
          target={{ pathname: "/", query: { op: "-", query: query } }}
        >
          Prev
        </Button>,
        <Button
          action="post"
          target={{ pathname: "/", query: { op: "+", query: query } }}
        >
          Next
        </Button>,
        <Button
          action="link"
          target={`https://warpcast.com/${currentResult.body.username}/${currentResult.merkleRoot}`}
        >
          Open Cast
        </Button>,
      ],
      // initial frame can't have state
      ...(ctx.request.method === "POST"
        ? { state: { counter: counter, results: newResults } }
        : {}),
    };
  } catch (err) {
    console.error(err);
    throw err;
  }
});

export const GET = frameHandler;
export const POST = frameHandler;
