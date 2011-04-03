var groups;
var extensions;
var options;

/* Return groups from localStorage or [] */
function loadGroups() {
  var groupStorage = localStorage.extensionerGroups;
  var myGroups = [];
  if(groupStorage) {
    try {
      myGroups = JSON.parse(groupStorage);
    } catch(e) {
      myGroups = [];
    }
  }
  if(!myGroups) {
    myGroups = [];
  }
  return myGroups;
}

/* load extra options (like autosave) */
function loadOptions() {
  var optionStorage = localStorage.extensionerOptions;
  var myOptions = {};
  if(optionStorage) {
    try {
      myOptions = JSON.parse(optionStorage);
    } catch(e) {
      myOptions = {};
    }
  }
  if(!myOptions) {
    myOptions = {};
  }
  return myOptions;
}

/* Stringify and save group list */
function saveGroups(newGroups) {
  localStorage['extensionerGroups'] = JSON.stringify(groups);
}

/* Stringify and save extra options */
function saveOptions(newOptions) {
  localStorage['extensionerOptions'] = JSON.stringify(newOptions);
}

function save() {
  var domGroups = $('#groups');
  groups = [];
  domGroups.find('.group_holder').each(function() {
    var groupHolder = $(this);
    var newGroup = {
      name: groupHolder.data('name'),
      extensions: []
    };
    groupHolder.find('ul li:not(.placeholder)').each(function(i, el) {
      newGroup.extensions.push($(this).data('id'));
    });
    groups.push(newGroup);
  });
  saveGroups(groups);

  var autosaveEnabled = $('#autosave').attr('checked');
  options = {
    autosave: autosaveEnabled
  };
  saveOptions(options);

  // only show notification if we're not autosaving
  if(!options.autosave) {
    // Update status to let user know options were saved.
    showStatus('Changes saved.');
  }
}

function showStatus(msg, error) {
  var status = $('#status');
  status.text(msg);
  if(error) {
    status.addClass('error');
  } else {
    status.removeClass('error');
  }
  status.css({right: -status.outerWidth()});
  status.animate({
    right: 0
  }, function() {
    setTimeout(function() {
      status.animate({right: -status.outerWidth()});
    }, 1500);
  });
}

function load() {
  groups = loadGroups();
  options = loadOptions();
  if(options.autosave) {
    $('#save_button').hide();
    $('#autosave').attr('checked', true);
  }
  chrome.management.getAll(populateExtensions);
}

function populateExtensions(extensionList) {
  extensions = {};
  var domList = $('#all_extensions');
  $.each(extensionList, function() {
    if(this.isApp) return;
    var newItem = $('<li></li>').data('id', this.id);
    var name = $('<div></div>').text(this.name);
    var version = $('<span class="version"></span>').text(this.version);
    if(!this.enabled) {
      version.text(version.text() + ' (disabled)');
    }
    name.append(version);
    var description = $('<div class="description"></div>').text(this.description);
    console.log(this);
    /*
    // Extension icons only work for enabled extensions?!
    var icons = this.icons;
    if(icons && icons.length) {
      for(var a = 0; a < icons.length; a++) {
        var image = icons[0].url;
        console.log('image ', image);
        newItem.prepend($('<img width="16" height="16" />').attr('src', image));
      }
    }
    */
    newItem.append(name, description);
    domList.append(newItem);
    extensions[this.id] = this.name;
  });
  domList.find('li').draggable({
    helper: 'clone',
    revert: 'invalid',
    containment: $('#main')
  }).disableSelection();

  var domGroups = $('#groups').empty();
  $.each(groups, function() {
    setupGroup(this);
  });
  domGroups.sortable({
    stop: function() {
      if(options.autosave) {
        save();
      }
    }
  });
}

function setupItem(item) {
  var newItem = $('<li></li>').text(extensions[item.id]).data('id', item.id);
  var remove = $('<span class="remove">X</span>').click(function() {
    var par = $(this).parent();
    par.fadeOut('fast', function() {
      if(par.parent().children().length == 1) {
        var place = $('<li class="placeholder">Drag an extension here!</li>');
        place.hide();
        par.parent().append(place);
        place.fadeIn('fast');
      }
      par.remove();
      if(options.autosave) {
        save();
      }
    });
  }).hover(function() {
    $(this).parent().addClass('hover');
  }, function() {
    $(this).parent().removeClass('hover');
  });
  newItem.prepend(remove);
  return newItem;
}

function setupGroup(group) {
  var newGroup = $('<div class="group_holder"></div>');
  var name = $('<h2>' + group.name + '</h2>');
  var deleteButton = $('<span class="delete">X</span>').click(function() {
    var myName = $(this).parent().parent().data('name');
    if(confirm('Are you sure you want to delete the group "' + myName + '"?')) {
      $(this).parent().parent().slideUp(function() {
        $(this).remove();
        if(options.autosave) {
          save();
        }
      });
    }
  });
  name.prepend(deleteButton);
  newGroup.append(name);
  newGroup.data('name', group.name);
  newGroup.attr('id', 'extensionerGroup' + group.name);
  $('#groups').append(newGroup);

  newGroup.append('<ul><li class="placeholder">Drag an extension here!</li></ul>');
  if(group.extensions && group.extensions.length != 0) {
    newGroup.find('.placeholder').remove();
    $.each(group.extensions, function() {
      if(!extensions[this]) {
        return;
      }
      var newItem = setupItem({id: this, name: extensions[this]});
      newGroup.find('ul').append(newItem);
    });
  }
  newGroup.droppable({
    accept: '.ui-draggable',
    activeClass: 'active',
    hoverClass: 'hover',
    drop: function(event, ui) {
      var id = $(ui.draggable).data('id');
      var found = false;
      newGroup.find('ul li').each(function() {
        if($(this).data('id') == id) {
          found = true;
        }
      });
      if(found) return;
      $(this).find('.placeholder').remove();
      var newItem = setupItem({id: $(ui.draggable).data('id'), name: $(ui.draggable).text()});
      $(this).find('ul').append(newItem);
      if(options.autosave) {
        save();
      }
    }
  }).find('ul').sortable({
    revert: true,
    stop: function() {
      if(options.autosave) {
        save();
      }
    }
  });
}

function createGroup() {
  var newName = $('#new_group').val();
  if(newName.length == 0) {
    showStatus('Invalid group name.', true);
    return;
  }
  var exists = false;
  $.each(groups, function() {
    if(newName == this.name) {
      exists = true;
    }
  });
  if(exists) {
    showStatus('Group already exists.', true);
    return;
  }
  var newGroup = {
    name: newName,
    extensions: []
  };
  setupGroup(newGroup);
  groups.push(newGroup);

  $('#new_group').val('');

  if(options.autosave) {
    save();
  }
}

/* Tell Chrome to enable/disable a list of extensions */
function enableExtensions(extensionList, enable) {
  $.each(extensionList, function() {
    chrome.management.setEnabled(""+this, enable);
  });
}

/* Called from the options.html onload event */
function setupOptionsPage() {
  load();

  $('#autosave').change(function() {
    options['autosave'] = $(this).attr('checked');
    
    // if this is checked, do our first autosave here
    if(options.autosave) {
      $('#save_button').hide();
      save();
    } else {
      // if it was unchecked, only save the options (not the groups)
      $('#save_button').show();
      saveOptions(options);
    }
  });

  $('#save_button').click(function() {
    save();
    return false;
  });

  $('#create_button').click(function() {
    createGroup();
    return false;
  });

  $('#new_group').keypress(function(e) {
    if(e.keyCode == 13) {
      $('#create_button').click();
    }
  });
}

/* Creates hash of counts for each groups enabled extensions. Assists with
 * figuring out whether a certain group is enabled or disabled */
function enabledExtensionsForGroups(groups, extensionList) {
  var groupCounts = {};
  var enabledExtensions = {};
  $.each(extensionList, function() {
    if(this.isApp) return;
    enabledExtensions[this.id] = this.enabled;
  });
  $.each(groups, function() {
    var count = 0;
    $.each(this.extensions, function() {
      if(enabledExtensions[this]) {
        count++;
      }
    });
    groupCounts[this.name] = count;
  });
  return groupCounts;
}

/* Called from the popup.html onload event */
function setupPopupPage() {
  function setupGroups(extensionList) {
    var domGroups = $('#popup_groups').show().empty();
    var groups = loadGroups();
    var groupExtCount = enabledExtensionsForGroups(groups, extensionList);
    if(groups.length == 0) {
      $('#popup_welcome').show();
      return;
    }
    $.each(groups, function() {
      var newGroup = $('<li></li>');
      newGroup.text(this.name);
      newGroup.data('extensions', this.extensions);
      if(groupExtCount[this.name] == this.extensions.length) {
        newGroup.addClass('enabled');
      } else if(groupExtCount[this.name] == 0) {
        newGroup.addClass('disabled');
      } else {
        newGroup.addClass('partial');
      }
      newGroup.click(function() {
        var enable = $(this).hasClass('disabled');
        enableExtensions($(this).data('extensions'), enable);
        $(this).removeClass('enabled disabled partial').addClass(enable ? 'enabled' : 'disabled');
        setupPopupPage();
      });
      domGroups.append(newGroup);
    });
  }
  chrome.management.getAll(setupGroups);
  $('#setup_link a').attr('href', chrome.extension.getURL('options.html'));
}
