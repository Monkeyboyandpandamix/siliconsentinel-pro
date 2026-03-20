/// <reference types="vite/client" />

interface WxOConfiguration {
  orchestrationID: string;
  hostURL: string;
  rootElementID: string;
  deploymentPlatform: string;
  crn: string;
  chatOptions: {
    agentId: string;
    agentEnvironmentId?: string;
  };
}

interface Window {
  wxOConfiguration?: WxOConfiguration;
  wxoLoader?: {
    init: () => void;
  };
}

interface ImportMetaEnv {
  readonly VITE_IBM_HOST_URL?: string;
  readonly VITE_IBM_ORCHESTRATION_ID?: string;
  readonly VITE_IBM_CRN?: string;
  readonly VITE_IBM_AGENT_ID?: string;
  readonly VITE_IBM_AGENT_ENVIRONMENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}
