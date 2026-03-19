/// <reference types="vite/client" />

interface WxOConfiguration {
  orchestrationID: string;
  hostURL: string;
  rootElementID: string;
  deploymentPlatform: string;
  crn: string;
  chatOptions: {
    agentId: string;
  };
}

interface Window {
  wxOConfiguration?: WxOConfiguration;
  wxoLoader?: {
    init: () => void;
  };
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
