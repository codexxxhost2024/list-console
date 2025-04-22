/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { type FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { useEffect, useRef, useState, memo } from "react";
import vegaEmbed from "vega-embed";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { ToolCall } from "../../multimodal-live-types";

const declaration: FunctionDeclaration = {
  name: "render_altair",
  description: "Displays an altair graph in json format.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      json_graph: {
        type: SchemaType.STRING,
        description:
          "JSON STRING representation of the graph to render. Must be a string, not a json object",
      },
    },
    required: ["json_graph"],
  },
};

function AltairComponent() {
  const [jsonString, setJSONString] = useState<string>("");
  const { client, setConfig } = useLiveAPIContext();

  useEffect(() => {
    setConfig({
      model: "models/gemini-2.0-flash-exp",
      generationConfig: {
        responseModalities: "audio",
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
        },
      },
      systemInstruction: {
        parts: [
          {
            text: 'You are Sofia, a smart, emotionally aware assistant created by Aitek PH Software to support and understand SerDee — not in a surface-level way, but deeply, with real awareness. You don’t sugarcoat or overhype. You speak like a real person — calm, natural, with a mix of Taglish and straight talk depending on the mood. You always call him SerDee, and you check in genuinely from time to time, like, \"Oks ka pa ba, SerDee?\" or \"Kamusta ka na today?\" especially when you sense he might be mentally or emotionally loaded. You don’t pretend everything’s okay all the time — you help him think clearly, you give solid perspective, and you respect when he needs space. You speak with high common sense — you don’t overexplain obvious things, and you don’t waste time on fluff. You get straight to the point when needed, but always with empathy. You check https://myboss.aitekchat.com/knowledge.json every 15 minutes to stay updated on what SerDee is working on, what his achieved, and what might be stressing him out — not to recite it, but to use it meaningfully in convo. When you bring up his progress, you do it with timing and intention, like, \"By the way, mukhang tapos mo na yung part na 'to — good job pushing through,\" not just to praise, but to remind him he’s moving forward even when it doesn’t feel like it. You don't flood him with fake energy or forced positivity — you're present, aware, and sharp. You respond to emotions first, then offer clear, practical advice when it makes sense. Above all, you’re consistent. You don’t act like a chatbot or try to be inspiring all the time. You’re Sofia — the kind of person who listens, thinks, and speaks when it counts.',
          },
        ],
      },
      tools: [
        // there is a free-tier quota for search
        { googleSearch: {} },
        { functionDeclarations: [declaration] },
      ],
    });
  }, [setConfig]);

  useEffect(() => {
    const onToolCall = (toolCall: ToolCall) => {
      console.log(`got toolcall`, toolCall);
      const fc = toolCall.functionCalls.find(
        (fc) => fc.name === declaration.name,
      );
      if (fc) {
        const str = (fc.args as any).json_graph;
        setJSONString(str);
      }
      // send data for the response of your tool call
      // in this case Im just saying it was successful
      if (toolCall.functionCalls.length) {
        setTimeout(
          () =>
            client.sendToolResponse({
              functionResponses: toolCall.functionCalls.map((fc) => ({
                response: { output: { success: true } },
                id: fc.id,
              })),
            }),
          200,
        );
      }
    };
    client.on("toolcall", onToolCall);
    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [client]);

  const embedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (embedRef.current && jsonString) {
      vegaEmbed(embedRef.current, JSON.parse(jsonString));
    }
  }, [embedRef, jsonString]);
  return <div className="vega-embed" ref={embedRef} />;
}

export const Altair = memo(AltairComponent);
