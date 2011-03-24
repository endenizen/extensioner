var groups;
var extensions;

// Saves options to localStorage.
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
  localStorage['extensionerGroups'] = JSON.stringify(groups);

  // Update status to let user know options were saved.
  showStatus('Changes saved.');
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

// Restores select box state to saved value from localStorage.
function load() {
  var groupStorage = localStorage.extensionerGroups;
  if(groupStorage) {
    groups = JSON.parse(groupStorage);
  }
  if(!groups) {
    groups = [];
  }
  chrome.management.getAll(populateExtensions);
}

function populateExtensions(extensionList) {
  extensions = {};
  var domList = $('#all_extensions');
  $.each(extensionList, function() {
    if(this.isApp) return;
    var newItem = $('<li></li>').text(this.name).data('id', this.id);
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
  domGroups.sortable();
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
    }
  }).find('ul').sortable({
    revert: true
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
}

$(document).ready(function() {
  load();

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
});
