/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import "./App.css";
import {
  joinRoom,
  type Room,
  type DataPayload,
  type RequestAction,
  type MessageAction,
} from "trystero";

const config = { appId: "prompt-together-test" };

function App() {
  const [loaded, setLoaded] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [peers, setPeers] = useState<number>(0);
  const [room, setRoom] = useState<Room>();
  const [promptAction, setPromptAction] = useState<
    RequestAction<DataPayload, any> | undefined
  >();
  
  const [messageAction, setMessageAction] = useState<
    MessageAction<string> | undefined
  >();
  const [chatHistory, setChatHistory] = useState<string[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>("");

  async function load() {
    // @ts-expect-error ts(2304)
    const session = await LanguageModel.create({
      monitor(m: { addEventListener: (arg0: string, arg1: (e: any) => void) => void; }) {
        m.addEventListener("downloadprogress", (e) => {
          setDownloadProgress(e.loaded * 100);
          console.log(`Downloaded ${e.loaded * 100}%`);
        });
      },
    });
    const r = joinRoom(config, "prompt-together-test");
    r.onPeerJoin = () => setPeers(Object.keys(r.getPeers()).length);
    r.onPeerLeave = () => setPeers(Object.keys(r.getPeers()).length);
    setPeers(Object.keys(r.getPeers()).length);
    setRoom(r);

    const message = r.makeAction<string>("message", {
      kind: "message",
      onMessage: (input) => {
        setChatHistory((o) => [input, ...o]);
      },
    });

    const prompt = r.makeAction("prompt", {
      kind: "request",
      onRequest: (text) => {
        console.log(session, text);
        session?.prompt(text).then((c: string) => {
          setChatHistory((o) => [c, ...o]);
          return message?.send(c);
        });
        return "asked";
      },
    });

    setPromptAction(prompt);
    setMessageAction(message);
    setLoaded(true);
  }

  async function askQuestion(input: string) {
    const peers = Object.keys(room?.getPeers() ?? []);
    const target = peers[Math.floor(Math.random() * peers.length)];
    console.log(target, input);
    setChatHistory((o) => [input, ...o]);
    await messageAction?.send(input);
    await promptAction?.request(input, {
      target: target,
    });
    setCurrentMessage("");
  }

  return (
    <>
      <section>
        <div><b>Chat together on other systems! (This only works in chrome)</b></div>
        <div>Made with <a href="https://developer.chrome.com/docs/ai/prompt-api">the new prompt API</a></div>
        <div><a href="https://github.com/jwdb/demo-prompt-api-together">Source</a></div>
        
        {!loaded && (<button onClick={load}>Load {downloadProgress > 0 ? (<>{downloadProgress}%</>) : (<></>)}</button>)}
        {loaded && (
          <>
          <div>Current peers {peers}</div>
            <div style={{ height: '80vh', display: "block", overflowY: "scroll"}}>
              <div>
              {chatHistory.map((message) => (
                <div style={{ border: 'solid 1px gray' }}>{message}</div>
              ))}
            </div>
            </div>
            <input
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key != "Enter") {
                  return;
                }
                askQuestion(currentMessage);
              }}
            ></input>
            <button onClick={() => askQuestion(currentMessage)}>Send</button>
          </>
        )}
      </section>
    </>
  );
}

export default App;
