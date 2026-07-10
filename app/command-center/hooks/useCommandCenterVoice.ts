import { useEffect, useState } from "react";

import { fetchWithAuth } from "@/lib/auth-fetch";

export function useCommandCenterVoice() {

  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [copilotResponse, setCopilotResponse] = useState("");

  useEffect(() => {

    if (
      typeof window === "undefined" ||
      !("webkitSpeechRecognition" in window)
    ) {
      return;
    }

    const SpeechRecognition =
      (window as any).webkitSpeechRecognition;

    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = async (event:any) => {

      const transcript =
        event.results[event.results.length - 1][0]
          .transcript
          .trim();

      setVoiceTranscript(transcript);

      try {

        const response = await fetchWithAuth("/api/copilot",{
          method:"POST",
          headers:{
            "Content-Type":"application/json"
          },
          body:JSON.stringify({
            question:transcript
          })
        });

        const result = await response.json();

        if(!response.ok){
          setCopilotResponse(
            result.error || "Voice copilot failed."
          );
          return;
        }

        setCopilotResponse(result.answer || "");

        if("speechSynthesis" in window){

          const utterance =
            new SpeechSynthesisUtterance(
              result.answer || ""
            );

          utterance.rate = 1;
          utterance.pitch = 1;

          window.speechSynthesis.speak(
            utterance
          );
        }

      } catch(err:any){

        setCopilotResponse(
          err.message || "Voice copilot failed."
        );

      }

    };

    if(voiceEnabled){
      recognition.start();
    }

    return () => recognition.stop();

  },[voiceEnabled]);

  return {

    voiceEnabled,
    setVoiceEnabled,

    voiceTranscript,

    copilotResponse,

  };

}
