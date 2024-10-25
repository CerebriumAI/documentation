// customize
const inkeepSettings = {
  baseSettings: {
    apiKey: "9ddec4493a80e40a51b3f23cf02c2caca5ada0b4aed2e007",
    integrationId: "clzr542ms00041subip8qtf6y",
    organizationId: "org_Qtt1DKDCsrdG2UqL",
    primaryBrandColor: "#EB3A6F",
  },
  aiChatSettings: {
    chatSubjectName: "Cerebrium",
    botAvatarSrcUrl:
      "https://framerusercontent.com/images/iIYnR41hLhNJq7vtreIPiv8K6Eo.png",
    getHelpCallToActions: [
      {
        name: "Contact Us",
        url: "mailto:support@cerebrium.ai",
        icon: {
          builtIn: "IoChatbubblesOutline",
        },
      },
    ],
    quickQuestions: [
      "How do I specify which files to include in my deployment?",
      "What types of dependencies does Cerebrium support?",
      "Where can I store models and files for faster loading?",
      "How to migrate from Replicate?",
    ],
  },
};

// The Mintlify search triggers, which we'll reuse to trigger the Inkeep modal
const searchButtonContainerIds = [
  "search-bar-entry",
  "search-bar-entry-mobile",
];

// Clone and replace, needed to remove existing event listeners
const clonedSearchButtonContainers = searchButtonContainerIds.map((id) => {
  const originalElement = document.getElementById(id);
  const clonedElement = originalElement.cloneNode(true);
  originalElement.parentNode.replaceChild(clonedElement, originalElement);

  return clonedElement;
});

// Load the Inkeep component library
const inkeepScript = document.createElement("script");
inkeepScript.type = "module";
inkeepScript.src = "https://unpkg.com/@inkeep/uikit-js@latest/dist/embed.js";
document.body.appendChild(inkeepScript);

// Once the Inkeep library is loaded, instantiate the UI components
inkeepScript.addEventListener("load", function () {
  // Customization settings

  // for syncing with dark mode
  const colorModeSettings = {
    observedElement: document.documentElement,
    isDarkModeCallback: (el) => {
      return el.classList.contains("dark");
    },
    colorModeAttribute: "class",
  };

  // Instantiate the 'Ask AI' pill chat button. Optional.
  Inkeep().embed({
    componentType: "ChatButton",
    colorModeSync: colorModeSettings,
    properties: inkeepSettings,
  });

  // Instantiate the search bar modal
  const inkeepSearchModal = Inkeep({
    ...inkeepSettings.baseSettings,
  }).embed({
    componentType: "CustomTrigger",
    colorModeSync: colorModeSettings,
    properties: {
      ...inkeepSettings,
      isOpen: false,
      onClose: () => {
        inkeepSearchModal.render({
          isOpen: false,
        });
      },
    },
  });

  // When the Mintlify search bar elements are clicked, open the Inkeep search modal
  clonedSearchButtonContainers.forEach((trigger) => {
    trigger.addEventListener("click", function () {
      inkeepSearchModal.render({
        isOpen: true,
      });
    });
  });

  // Open the Inkeep Modal with cmd+k
  window.addEventListener(
    "keydown",
    (event) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        (event.key === "k" || event.key === "K")
      ) {
        event.stopPropagation();
        inkeepSearchModal.render({ isOpen: true });
        return false;
      }
    },
    true,
  );
});
