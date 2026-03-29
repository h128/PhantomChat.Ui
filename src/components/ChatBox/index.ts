import { ChatBoxBody } from "./ChatBoxBody";
import { ChatBoxFooter } from "./ChatBoxFooter";
import { ChatBoxRoot } from "./ChatBoxRoot";
import { ChatBoxTitle } from "./ChatBoxTitle";

export const ChatBox = Object.assign(ChatBoxRoot, {
  Title: ChatBoxTitle,
  Body: ChatBoxBody,
  Footer: ChatBoxFooter,
});
