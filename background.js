// Whenever user activates a tab, if the tab is a member of a group,
// record this as a property {groupId: tabId} in session storage
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, async (tab) => {
    if (tab.groupId !== -1)
      await chrome.storage.session.set({[tab.groupId]: activeInfo.tabId});
      console.log("Added tabId " + activeInfo.tabId)
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
  let targetTab = await chrome.storage.session.get(String(targetGroup.id))
  .then(response => response[targetGroup.id]).catch((e) => {console.log(e)}) ?? lastTabInActiveGroup;
  chrome.tabs.update(
    targetTab,
    {active: true}, (tab) => {
    chrome.storage.session.set({[targetGroup.id]: tab.id});
  });
});

// If a tab is moved from one group to another, updates session storage to reflect
// the move. Without this the source group will be stuck closed
chrome.tabs.onUpdated.addListener((movedTabId, moveInfo, tab) => {
  if (moveInfo.groupId === undefined)
    return;
  chrome.storage.session.get(null, items => {
    for (let storedGroupId in items) {
      if (items[storedGroupId] === movedTabId && moveInfo.groupId !== storedGroupId) {
        chrome.storage.session.remove(String(storedGroupId));
        console.log(`Tab ${tab.title} moved from group ${storedGroupId}
          to group ${moveInfo.groupId}`);
      }
    }
  });
});

// When a group is removed, updates session storage
chrome.tabGroups.onRemoved.addListener(group => {
  console.log(`Removing group "${group.title}"`);
  chrome.storage.session.remove(String(group.id));
});

// TODO: Implement keyboard shortcuts to open groups

 /* chrome.commands.onCommand.addListener((command) => {
    if (command === "addTabToActiveGroup") {
        chrome.tabs.create({}, (tab) => {
            chrome.tabs.group({groupId: activeGroupId, tabIds: tab.id});
        }); 
    }
*/
    /* let groupNum = (parseInt(command.charAt(command.length - 1)) - 1);
    
    chrome.tabGroups.query({}, (tabsInGroup) => {
        chrome.tabGroups.update(tabsInGroup[groupNum].id, {collapsed: false});
    }); */

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