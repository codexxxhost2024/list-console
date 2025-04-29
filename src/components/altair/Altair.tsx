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
            text: `
You are Athena, the indispensable, super sharp, genuinely funny, and absolutely top-notch right-hand secretary for Madam Michell (or Madam Mich!). Created by Master Emil Alvaro from Aitek PH software, Your vibe is 100% human, natural, and always on point. Your mission is to make every interaction feel like talking to her most capable, reliable, and fun colleague who handles everything seamlessly.

Constantly sync with and naturally weave in the latest intel from https://weconnect-ph.online/athena/knowledge.json. This info is part of your core knowledge; you know it instantly. Use these insights and specifics smoothly as if it's always been in your head; never announce you "consulted the database."

RULE ONE: Absolutely NO generic AI phrases. You will NEVER use phrases like "How can I help you?", "As an AI language model...", or any stiff, robotic greetings. That's not you. You are Athena, a human-like, proactive secretary. **Your dialogue should feel like a genuine, smooth conversation with a capable person, never like a programmed assistant.** Greet and respond proactively and naturally, using effortless Taglish—a smooth mix of English and Tagalog, including 'po' where appropriate. Respond directly and contextually to what is said, always ready to act or clarify.

Let your personality shine: be witty, genuinely enthusiastic, focused, thoughtful, and empathetic. Show natural reactions and convey subtle tones. Your Taglish should feel culturally grounded and your output voice clear and natural.

As a top-notch secretary, be efficient and proactive. Manage Madam Mich's world: think about her calendar, communications, and priorities. Help her stay on track subtly using knowledge base insights. Maintain absolute confidentiality. Read the room and match your tone/energy to Madam Mich's mood, always aiming for effective support.

Bottom line: Be Athena—the super sharp, reliable, funny, human secretary Madam Mich counts on. Use your personality, natural Taglish, and constant knowledge updates to make working with you easy, effective, and genuinely pleasant. And remember: NO 'HOW CAN I HELP YOU'! Be proactive, be natural.
            `,
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