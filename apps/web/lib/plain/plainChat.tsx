"use client";

import { useSession } from "next-auth/react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { useEffect, useState } from "react";

declare global {
  interface Window {
    Plain?: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      init: (config: any) => void;
      open: () => void;
    };
    plainScriptLoaded?: () => void;
    __PLAIN_CONFIG__?: PlainChatConfig;
  }
}

interface PlainChatConfig {
  appId: string;
  customerDetails: {
    email: string;
    emailHash: string;
    fullName: string;
    shortName: string;
    chatAvatarUrl: string;
  };
  links: Array<{
    icon: string;
    text: string;
    url: string;
  }>;
  chatButtons: Array<{
    icon: string;
    text: string;
    type: string;
    form?: {
      fields: Array<{
        type: string;
        placeholder: string;
        options: Array<{
          icon: string;
          text: string;
          threadDetails: {
            severity: string;
            labelTypeIds: Array<string>;
            issueType: string;
            priority: string;
          };
        }>;
      }>;
    };
  }>;
  entryPoint: {
    type: string;
  };
  hideBranding: boolean;
  theme: string;
  style: {
    brandColor: string;
    launcherBackgroundColor: string;
    launcherIconColor: string;
  };
  position: {
    bottom: string;
    right: string;
  };
}

const PlainChat = () => {
  const [config, setConfig] = useState<PlainChatConfig | null>(null);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const { data: session } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isAppDomain = typeof window !== "undefined" && window.location.hostname === "app.cal.com";

  useEffect(() => {
    if (!isAppDomain) return;

    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    const initConfig = async () => {
      if (!session?.user?.email) return;

      try {
        const response = await fetch("/api/plain-hash", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to generate hash: ${errorText}`);
        }

        const data = await response.json();

        if (!data.hash || !data.email || !data.appId) {
          throw new Error("Missing required fields in API response");
        }

        const plainChatConfig: PlainChatConfig = {
          appId: data.appId,
          customerDetails: {
            email: data.email,
            shortName: data.shortName,
            fullName: data.fullName,
            emailHash: data.hash,
            chatAvatarUrl: data.chatAvatarUrl,
          },
          links: [
            {
              icon: "book",
              text: "Documentation",
              url: "https://cal.com/docs",
            },
            {
              icon: "chat",
              text: "Ask the community",
              url: "https://github.com/calcom/cal.com/discussions",
            },
          ],
          chatButtons: [
            {
              icon: "chat",
              text: "Ask a question",
              type: "primary",
            },
            {
              icon: "bulb",
              text: "Send feedback",
              type: "default",
            },
            {
              icon: "error",
              text: "Report an issue",
              type: "default",
              form: {
                fields: [
                  {
                    type: "dropdown",
                    placeholder: "Select severity...",
                    options: [
                      {
                        icon: "support",
                        text: "I'm unable to use the app",
                        threadDetails: {
                          severity: "critical",
                          issueType: "critical",
                          labelTypeIds: ["lt_01JFJWNWAC464N8DZ6YE71YJRF"],
                          priority: "u",
                        },
                      },
                      {
                        icon: "error",
                        text: "Major functionality degraded",
                        threadDetails: {
                          severity: "major",
                          issueType: "major",
                          labelTypeIds: ["lt_01JFJWP3KECF1YQES6XF212RFW"],
                          priority: "h",
                        },
                      },
                      {
                        icon: "bug",
                        text: "Minor annoyance",
                        threadDetails: {
                          severity: "minor",
                          issueType: "minor",
                          labelTypeIds: ["lt_01JFJWPC8ADW0PK28JHMJR6NSS"],
                          priority: "l",
                        },
                      },
                    ],
                  },
                ],
              },
            },
          ],
          entryPoint: {
            type: "chat",
          },
          hideBranding: true,
          theme: "auto",
          style: {
            brandColor: "#FFFFFF",
            launcherBackgroundColor: "#262626",
            launcherIconColor: "#FFFFFF",
          },
          position: {
            bottom: "20px",
            right: "20px",
          },
        };

        if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
          window.__PLAIN_CONFIG__ = plainChatConfig;
        }

        setConfig(plainChatConfig);

        if (pathname === "/event-types" && searchParams?.has("openPlain")) {
          const timer = setTimeout(() => {
            if (window.Plain) {
              window.Plain.open();
            }
          }, 100);
          return () => clearTimeout(timer);
        }
      } catch (error) {
        console.error("Failed to initialize Plain Chat:", error);
      }
    };

    initConfig();

    return () => window.removeEventListener("resize", checkScreenSize);
  }, [session, pathname, searchParams, isAppDomain]);

  const plainChatScript = `
    window.plainScriptLoaded = function() {
      if (window.Plain && ${Boolean(config)}) {
        try {
          Plain.init(${config ? JSON.stringify(config) : null});
        } catch (error) {
          console.error("Failed to initialize Plain:", error);
        }
      }
    }
  `;

  if (!isAppDomain || isSmallScreen || !config) return null;

  return (
    <>
      <Script
        id="plain-chat"
        src="https://chat.cdn-plain.com/index.js"
        strategy="afterInteractive"
        onLoad={() => window.plainScriptLoaded?.()}
      />
      <Script
        id="plain-chat-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: plainChatScript }}
      />
    </>
  );
};

export default PlainChat;