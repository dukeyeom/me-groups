async function openTargetGroup(targetGroup) {
  console.log(`Running openTargetGroup(${targetGroup})`);
  chrome.tabGroups.update(targetGroup, {collapsed: false});
}

async function collapseAllButTargetGroup(targetGroup) {
  return chrome.tabGroups.query({windowId: targetGroup.windowId}, (groupsInActiveWindow) => {
    groupsInActiveWindow.forEach(groupIterator => {
      if (targetGroup.id !== groupIterator.id) {
        chrome.tabGroups.onUpdated.removeListener();
        // Make the listener look the other way for a sec, otherwise we enter an infinite loop
        chrome.tabGroups.update(groupIterator.id, {collapsed: true});
        chrome.tabGroups.onUpdated.addListener();
      }
    });
  })
};

async function openLastActiveTabInGroup(targetGroup) {
  let tabsInActiveGroup = await chrome.tabs.query({groupId: targetGroup});
  let lastTabInActiveGroup = tabsInActiveGroup[tabsInActiveGroup.length-1].id;
  let targetTab = await chrome.storage.session.get(String(targetGroup))
  .then(response => response[targetGroup]).catch((e) => {console.log(e)}) ?? lastTabInActiveGroup;
  chrome.tabs.update(
    targetTab,
    {active: true}, (tab) => {
    chrome.storage.session.set({[targetGroup]: tab.id});
  });
}

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
  await collapseAllButTargetGroup(targetGroup);
  // Activate last opened tab (if none recorded then last tab) in target group
  openLastActiveTabInGroup(targetGroup.id);
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

// Given a windowId, returns an array of groupIds corresponding to
// visual order of groups in the specified window
// (Chrome API provides no easy way to retrieve this index, so I have to find it myself!)
async function getGroupIndexArray(windowId) {
  let groupIdArray = [];
  return await chrome.tabs.query({windowId})
    .then(tabArray => {
      tabArray.sort((a, b) => {
        if (a.index < b.index) return -1;
        if (a.index === b.index) return 0;
        if (a.index > b.index) return 1;
      })
      for (let tab of tabArray) {
        if (tab.groupId !== -1 && groupIdArray.at(-1) !== tab.groupId)
          groupIdArray.push(tab.groupId);
      }
      return groupIdArray;
    });
};

chrome.commands.onCommand.addListener(async command => {
  if (command.includes('openTabGroup')) {
    console.log(`Running command ${command}`);
    const groupNum = Number(command.charAt(command.length - 1));
    const groupIdArray = await getGroupIndexArray(chrome.windows.WINDOW_ID_CURRENT);
    const targetGroup = groupIdArray[groupNum-1];
    if (targetGroup) {
      console.log(`Opening group id = ${targetGroup}`);
      collapseAllButTargetGroup(targetGroup);
      openTargetGroup(targetGroup);
      openLastActiveTabInGroup(targetGroup);
    }
  }
});