let activeGroupId;
let lastActiveTab = {};

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab.groupId !== -1)
    lastActiveTab[tab.groupId] = activeInfo.tabId;
  });
  console.log(lastActiveTab);
});

chrome.tabGroups.onUpdated.addListener((group) => {
  if (group.collapsed) { return; }
  let str = "Group " + group.title + " is " + ((group.collapsed) ? "open" : "closed") + " (id " + group.id + ")";
  console.log(str);

  chrome.tabGroups.query({}, (TabGroupArray) => {
      console.log(TabGroupArray.length);
      
      TabGroupArray.forEach(groupIterator => {

          if (group.id !== groupIterator.id) {
              chrome.tabGroups.onUpdated.removeListener();
              chrome.tabGroups.update(groupIterator.id, {collapsed: true});
              chrome.tabGroups.onUpdated.addListener();
          }
          else {
              activeGroupId = group.id;
          }
          console.log(groupIterator.collapsed);
      });
  })
  console.log("activeGroupId: " + group.id);
  let tabToSwitchTo = lastActiveTab?.[group.id];
  //chrome.tabs.query({groupId: group.id}, result => {result.id; console.log("tab: " +result.id);}).then(
  chrome.tabs.update(
    tabToSwitchTo,
    {active: true}, (tab) => {
    lastActiveTab[activeGroupId] = tab.id;
  });
  console.log("Switching to tabId " + tabToSwitchTo);
});

chrome.commands.onCommand.addListener((command) => {
    if (command === "addTabToActiveGroup") {
        chrome.tabs.create({}, (tab) => {
            chrome.tabs.group({groupId: activeGroupId, tabIds: tab.id});
        });
    }

    /* let groupNum = (parseInt(command.charAt(command.length - 1)) - 1);
    
    chrome.tabGroups.query({}, (TabGroupArray) => {
        chrome.tabGroups.update(TabGroupArray[groupNum].id, {collapsed: false});
    }); */
});

/*
    "select-tabGroup-1": {
      "suggested_key": {
        "default": "Alt+1",
        "mac": "Alt+1"
      },
      "description": "Select tab group 2."
    },
    "select-tabGroup-2": {
      "suggested_key": {
        "default": "Alt+2",
        "mac": "Alt+2"
      },
      "description": "Select tab group 3."
    },
    "select-tabGroup-3": {
      "suggested_key": {
        "default": "Alt+3",
        "mac": "Alt+3"
      },
      "description": "Select tab group 3."
    },
    "select-tabGroup-4": {
      "suggested_key": {
        "default": "Alt+4",
        "mac": "Alt+4"
      },
      "description": "Select tab group 4."
    }
*/