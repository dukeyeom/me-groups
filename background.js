// Keeps track of which tab to switch to when reopening a group.
// Keys: groupIds | Values: tabIds
let lastActiveTab = {};

// Whenever user activates a tab, if the tab is a member of a group,
// track it in lastActiveTab 
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab.groupId !== -1)
      lastActiveTab[tab.groupId] = activeInfo.tabId;
  });
});

chrome.tabGroups.onUpdated.addListener(async (targetGroup) => {
  if (targetGroup.collapsed) { return; }
  let str = "Group " + targetGroup.title + " is " + ((targetGroup.collapsed) ? "closed" : "open") + " (id " + targetGroup.id + ")";
  console.log(str);
  // Collapse all other groups that share the same window as target group
  chrome.tabGroups.query({windowId: targetGroup.windowId}, (groupsInActiveWindow) => {
    groupsInActiveWindow.forEach(groupIterator => {
      if (targetGroup.id !== groupIterator.id) {
        chrome.tabGroups.onUpdated.removeListener();
        // Make the listener look the other way for a sec, otherwise we enter an infinite loop
        chrome.tabGroups.update(groupIterator.id, {collapsed: true});
        chrome.tabGroups.onUpdated.addListener();
      }
    });
  })
  // Activate last opened tab (if none recorded then last tab) in target group
  let tabsInActiveGroup = await chrome.tabs.query({groupId: targetGroup.id});
  let lastTabInActiveGroup = tabsInActiveGroup[tabsInActiveGroup.length-1].id;
  chrome.tabs.update(
    lastActiveTab?.[targetGroup.id] ?? lastTabInActiveGroup,
    {active: true}, (tab) => {
    lastActiveTab[targetGroup.id] = tab.id;
  });
});

chrome.commands.onCommand.addListener((command) => {
    if (command === "addTabToActiveGroup") {
        chrome.tabs.create({}, (tab) => {
            chrome.tabs.group({groupId: activeGroupId, tabIds: tab.id});
        });
    }

    /* let groupNum = (parseInt(command.charAt(command.length - 1)) - 1);
    
    chrome.tabGroups.query({}, (tabsInGroup) => {
        chrome.tabGroups.update(tabsInGroup[groupNum].id, {collapsed: false});
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