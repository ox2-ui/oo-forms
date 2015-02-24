Template.ooFormButton.events({
  'click button' : function (e, t) {
    var self = this,
      haveErrors = false,
      query = {},
      form = $("#" + e.target.attributes['formId'].value)[0];

    for (var i = form.length - 1; i >= 0; i--) {
      var input = Blaze.getView(form[i])._templateInstance;

      if (!input)
        input = Blaze.getView(form[i]).parentView._templateInstance;

      input.validationCheck();
      if (input.haveErrors.get())
        haveErrors = true;

      if (!haveErrors) {
        var dataField = input.data.field
        query[dataField] = input.currentValue.get()
      }
    }

    if (!haveErrors) {
      if (self.collection && self.formType) {
        if (self.formType === 'update' && self.docId)  {

          Collection[self.collection].update({
            _id: self.docId}, {$set: query}, function (err, res) {
            console.log(err)
          })

        } else if (self.formType === 'insert') {
          Collection[self.collection].insert(
            query, function (err,res) {
            if (err)
              console.log(err)
          })

        } else {
            console.log('%c error: incorrect formType specified - ' + self.formType,  'background: #BD4F7A; color: white; padding: 1px 15px 1px 5px;', self);
        }

      } else if (self.callback) {
        console.log('%c self   ',  'background: #B3CC57; color: white; padding: 1px 15px 1px 5px;', self);
        var fn = ooForms[self.callback];

        if (typeof fn === 'function')
          fn(query, self.docId);
        else
          console.log('%c error: callback not found - ' + self.callback,  ' background: #BD4F7A; color: white; padding: 1px 15px 1px 5px;', self);

      } else {
        console.log('%c error: no update handlers passed  ',  'background: #BD4F7A; color: white; padding: 1px 15px 1px 5px;', self);
      }
    }

  }
});

// var lazyUpdate = function_.debounce(updateRecord(collection,field,val), 1000);

// var lazyUpdate = function (collection, field, val) {
//   console.log('%c Saved   ',  'background: #5D76DB; color: white; padding: 1px 15px 1px 5px;');
//   _.debounce(updateRecord(collection,field,val), 1000);
// }


function updateRecord() {
  // field will be depricated towards fieldName

  var self = this;
  self.recordUpdateStatus.set("update:warning");
  self.recordUpdateMessage.set("Auto Saving");
  if (self.haveErrors.get()) {
    console.log('%c haveErrors   ',  'background: #5D76DB; color: white; padding: 1px 15px 1px 5px;');
    self.recordUpdateStatus.set("update:critical");
    self.recordUpdateMessage.set("Not Saved");
  } else {
    // collection update callback
    var query = {};
    if (self.data.field)
      query[self.data.field] = self.currentValue.get();
    if (self.data.fieldName)
      query[self.data.fieldName] = self.currentValue.get();
    // for tracking done fields
    if (self.data.checkmark) {
      if (self.data.field)
        query[self.data.field + 'Done'] = true;
      if (self.data.fieldName)
        query[self.data.fieldName + 'Done'] = true;
    }

    Collection[self.data.collection].update({_id: self.data.docId}, {$set: query}, function (err, res) {
      if (res) {
          self.recordUpdateStatus.set("update:success");
          self.recordUpdateMessage.set("Saved");
          self.savedValue.set(self.currentValue.get());
      } else if (err) {
        console.log(err)
        self.recordUpdateStatus.set("update:critical");
        self.recordUpdateMessage.set("Database Error, Not Saved");
      }
    })

  }


}


Template.ooInput.events({
  'input, blur' : function (e, t) {
    var self = this;
    if (self.autoResize) {
      el = e.target;
      if (el.scrollHeight > t.initialHeight.get() && (el.scrollHeight + 'px') !== el.style.height) {
        el.style.height = 'auto';
        el.style.height = el.scrollHeight+'px';
        el.scrollTop = el.scrollHeight;
      }
    }
    t.currentValue.set(e.currentTarget.value);
    t.charCount.set(e.currentTarget.value.length);
    t.validationCheck()
  },
  'touchstart .js-textarea': function(e, t) {
    // works only with textarea
    // sets start position
    var self = this;
    if (self.multiline && !self.autoResize) {
      t.scrollStartY.set(e.originalEvent.touches[0].clientY)
    }
  },
  'touchmove .js-textarea': function (e, t) {
    // works only with textarea
    var self = this;
    if (self.multiline && !self.autoResize) {
      var scrollMoveY = e.originalEvent.changedTouches[0].clientY;
      var topOffset = e.target.scrollTop;
      var maxContentHeight = e.target.scrollHeight
      var itemHeight = e.target.clientHeight
      // Prevent dragging when cotent is scrolled to bottom
      if (t.scrollStartY.get() > scrollMoveY) {
          if ((topOffset + itemHeight) === maxContentHeight)
            e.preventDefault();
      } else {
        // Prevent dragging when 'top' offset is 0 (content top reached)
        if (!topOffset)
          e.preventDefault();
      }
    }
  }
});

Template.ooInput.created = function () {
  var self = this;
  if (!self.data) {
    console.log('%c ooInput no data passed to component   ',  'background: #5D76DB; color: white; padding: 1px 15px 1px 5px;');
    return
  }
  self.inputId = new Blaze.ReactiveVar(self.data.inputId ? self.data.inputId : Random.id());
  self.currentValue = new Blaze.ReactiveVar(self.data.value ? self.data.value: '');
  self.recordUpdateStatus = new Blaze.ReactiveVar(false);
  self.recordUpdateMessage = new Blaze.ReactiveVar(false);
  self.noticeStatus = new Blaze.ReactiveVar(false);
  self.noticeMessage = new Blaze.ReactiveVar(false);
  self.haveErrors = new Blaze.ReactiveVar(false);
  self.savedValue = new Blaze.ReactiveVar(false);

  self.charCount = new Blaze.ReactiveVar(false);
  self.charLimitStatus = new Blaze.ReactiveVar(false);

  //START textarea specific
  if (self.data.multiline) {
    self.initialHeight = new Blaze.ReactiveVar(0);
  }
  // END
  // setting up character limit vars
  if (self.data.charLimit) {
    var currentCharCount = self.data.value ? self.data.value.length : 0;
    self.charCount.set(currentCharCount)
  }

  self.validationCheck = function () {
    var currentValueLength = self.currentValue.get().length
    var charLimit = self.data.charLimit;
    var warningTreshold = charLimit - Math.round(charLimit / 100 * 20); // 20% of the character limit

    // Check if field character limit is reached
    if (currentValueLength > charLimit)
      self.charLimitStatus.set("limit:critical");
    else if (currentValueLength >= warningTreshold)
      self.charLimitStatus.set("limit:warning");
    else
      self.charLimitStatus.set("");

    // Check if field is empty
    if (self.data.required && !currentValueLength) {
      self.noticeStatus.set("notice:critical");
      self.noticeMessage.set("Required");
    } else {
      self.noticeStatus.set("");
      self.noticeMessage.set("");
    }

    // Check if there are any errors
    if (self.noticeStatus.get() === "notice:critical" || self.charLimitStatus.get() === "limit:critical") {
      self.haveErrors.set(true)
    } else {
      self.haveErrors.set(false)
    }

    // Handle autoUpdate input
    if (self.data.autoUpdate && self.data.docId) {
      // Update record if value changed and there are no errors
      if(self.savedValue.get() !== self.currentValue.get()) {
        if (!self.haveErrors.get()) {
          self.recordUpdateStatus.set(false);
          self.recordUpdateMessage.set("");
          self.lazyUpdate();
        } else {
          self.recordUpdateStatus.set("update:critical");
          self.recordUpdateMessage.set("Not Saved");
        }
      }
    }
  }

  // Updating record with a debounce function to avoid firing too many times
  if (self.data.autoUpdate && self.data.docId)
    self.lazyUpdate = _.debounce(updateRecord, 1000);

};

Template.ooInput.rendered = function() {
  var self = this;
  if (self.data.multiline && self.data.autoResize) {
    Meteor.defer(function() {
      var el = self.find(".js-textarea");
      el.style.height = 'auto';
      el.style.height = el.scrollHeight+'px';
      el.scrollTop = el.scrollHeight;
      self.initialHeight.set(el.offsetHeight);
    })
  }
}

Template.ooInput.helpers({
  charCount: function() {
   return Template.instance().charCount.get();
  },
  charLimitStatus: function() {
   return Template.instance().charLimitStatus.get();
  },
  updateStatus: function() {
   return Template.instance().recordUpdateStatus.get();
  },
  updateMessage: function() {
   return Template.instance().recordUpdateMessage.get();
  },
  noticeStatus: function() {
   return Template.instance().noticeStatus.get();
  },
  noticeMessage: function() {
   return Template.instance().noticeMessage.get();
  },
  inputId: function() {
    return Template.instance().inputId.get();
  },
});

// ooFormWrapper

Template.ooFormWrapper.created = function() {
  var self = this;
  if (!self.data.formId)
    self.data.formId = Random.id();
}

Template.ooFormWrapper.events({
  'click ': function(e, t) {
    e.preventDefault();
    e.stopPropagation();
  },
  'keypress input': function(e, t) {
    if (e.keyCode === 13) {
      e.preventDefault();
      e.stopPropagation();
    }
  }
})


// ooTextarea
// params - autoUpdate, rows, charLimit, collection, docId, fieldName, fieldValue
Template.ooTextarea.created = function() {
  var self = this;
  if (!self.data) {
    console.log('%c ooTextarea no data passed to component   ',  'background: #5D76DB; color: white; padding: 1px 15px 1px 5px;');
    return
  }
  self.scrollStartY = new Blaze.ReactiveVar(0);
  self.initialHeight = new Blaze.ReactiveVar(0);
  self.inputId = new Blaze.ReactiveVar(Random.id());
  self.currentValue = new Blaze.ReactiveVar(self.data.value ? self.data.value: '');
  self.recordUpdateStatus = new Blaze.ReactiveVar(false);
  self.recordUpdateMessage = new Blaze.ReactiveVar(false);
  self.noticeStatus = new Blaze.ReactiveVar(false);
  self.noticeMessage = new Blaze.ReactiveVar(false);
  self.haveErrors = new Blaze.ReactiveVar(false);
  self.savedValue = new Blaze.ReactiveVar(false);

  self.charCount = new Blaze.ReactiveVar(false);
  self.charLimitStatus = new Blaze.ReactiveVar(false);

  if (self.data.charLimit) {
    var currentCharCount = self.data.value ? self.data.value.length : 0;
    self.charCount.set(currentCharCount)
  }

  self.validationCheck = function () {
    var currentValueLength = self.currentValue.get().length
    var charLimit = self.data.charLimit;
    var warningTreshold = charLimit - Math.round(charLimit / 100 * 20); // 20% of the character limit

    // Check if field character limit is reached
    if (currentValueLength > charLimit)
      self.charLimitStatus.set("limit:critical");
    else if (currentValueLength >= warningTreshold)
      self.charLimitStatus.set("limit:warning");
    else
      self.charLimitStatus.set("");

    // Check if field is empty
    if (self.data.required && !currentValueLength) {
      self.noticeStatus.set("notice:critical");
      self.noticeMessage.set("Required");
    } else {
      self.noticeStatus.set("");
      self.noticeMessage.set("");
    }

    // Check if there are any errors
    if (self.noticeStatus.get() === "notice:critical" || self.charLimitStatus.get() === "limit:critical") {
      self.haveErrors.set(true)
    } else {
      self.haveErrors.set(false)
    }

    // Handle autoUpdate input
    if (self.data.autoUpdate) {
      // Update record if value changed and there are no errors
      if(self.savedValue.get() !== self.currentValue.get()) {
        if (!self.haveErrors.get()) {
          self.recordUpdateStatus.set(false);
          self.recordUpdateMessage.set("");
          self.lazyUpdate();
        } else {
          self.recordUpdateStatus.set("update:critical");
          self.recordUpdateMessage.set("Not Saved");
        }
      }
    }
  }

  // Updating record with a debounce function to avoid firing too many times
  if (self.data.autoUpdate)
    self.lazyUpdate = _.debounce(updateRecord, 1000);
}


Template.ooTextarea.rendered = function () {
  // console.log('%c Template.instance()   ',  'background: #FF9900; color: white; padding: 1px 15px 1px 5px;', Template.instance());
  // console.log('%c this   ',  'background: #FF9900; color: white; padding: 1px 15px 1px 5px;', this);
  var self = this;
  Meteor.defer(function() {
    var el = self.find(".js-textarea");
    self.initialHeight.set(el.offsetHeight);
  })
};


Template.ooTextarea.events({
  'input .js-textarea': function(e, t) {
    // borrowed from http://maximilianhoffmann.com/posts/autoresizing-textareas
    // sets start position
    var self = this;
    if (self.autoResize) {
      el = e.target;
      if (el.scrollHeight > t.initialHeight.get() && (el.scrollHeight + 'px') !== el.style.height) {
        el.style.height = 'auto';
        el.style.height = el.scrollHeight+'px';
        el.scrollTop = el.scrollHeight;
        // window.scrollTo(window.scrollLeft,(el.scrollTop+el.scrollHeight));
        // if (self.dirtyDiana) {
        //   console.log('%c self.dirtyDiana   ',  'background: #FF9900; color: white; padding: 1px 15px 1px 5px;', self.dirtyDiana);
        //   var activeView = FView.byId(self.dirtyDiana)
        //   if (activeView)
        //     activeView.surface._contentDirty = true;
        // }
      }
    }
    t.currentValue.set(e.currentTarget.value);
    t.charCount.set(e.currentTarget.value.length);

    t.validationCheck()

  }
  // ,
  // 'touchstart .js-textarea': function(e, t) {
  //   // sets start position
  //   t.scrollStartY.set(e.originalEvent.touches[0].clientY)
  // },
  // 'touchmove .js-textarea': function (e, t) {
  //   var scrollMoveY = e.originalEvent.changedTouches[0].clientY;
  //   var topOffset = e.target.scrollTop;
  //   var maxContentHeight = e.target.scrollHeight
  //   var itemHeight = e.target.clientHeight
  //   // Prevent dragging when cotent is scrolled to bottom
  //   if (t.scrollStartY.get() > scrollMoveY) {
  //       if ((topOffset + itemHeight) === maxContentHeight)
  //         e.preventDefault();
  //   } else {
  //     // Prevent dragging when 'top' offset is 0 (content top reached)
  //     if (!topOffset)
  //       e.preventDefault();
  //   }
  // }
})

Template.ooNativeScroller.created = function () {
  var self = this;
  self.scrollStartY = new Blaze.ReactiveVar(0);
  self.callbackInProgress = new Blaze.ReactiveVar(false);
};

Template.ooNativeScroller.events({
  'scroll': function(e, t) {
    var self = this;
    if (!t.callbackInProgress.get()) {
      var topOffset = e.currentTarget.scrollTop;
      var maxContentHeight = e.currentTarget.scrollHeight
      var itemHeight = e.currentTarget.clientHeight
      if ((topOffset + itemHeight) === maxContentHeight) {
        e.preventDefault();
        if (self.loadMore) {
              var fn = ooForms[self.loadMore];

          if (typeof fn === 'function') {
            fn(function(result) {
              if (result) {
                t.callbackInProgress.set(false)
              } else {
                t.callbackInProgress.set(false)
              }
            })
          } else {
            t.callbackInProgress.set(false)

          }

        }
      }
    }
  },
  'touchstart .js-noEdgeDrag': function(e, t) {
    // sets start position
    t.scrollStartY.set(e.originalEvent.touches[0].clientY)
  },
  'touchmove .js-noEdgeDrag': function (e, t) {
    var self = this;
    var scrollMoveY = e.originalEvent.changedTouches[0].clientY;
    var topOffset = e.currentTarget.scrollTop;
    var maxContentHeight = e.currentTarget.scrollHeight
    var itemHeight = e.currentTarget.clientHeight
    // Prevent dragging when cotent is scrolled to bottom
    if (t.scrollStartY.get() > scrollMoveY) {
        if ((topOffset + itemHeight) === maxContentHeight) {
          e.preventDefault();
          // if (self.loadMore) {
          //   if (!t.callbackInProgress.get()) {
          //       t.callbackInProgress.set(true)
          //       var fn = ooForms[self.loadMore];

          //       if (typeof fn === 'function') {
          //         fn(function(result) {
          //           if (result) {
          //             t.callbackInProgress.set(false)
          //           } else {
          //             t.callbackInProgress.set(false)
          //           }
          //         });
          //       } else {
          //         t.callbackInProgress.set(false)

          //       }

          //   }
          // }
        }
    } else {
      // Prevent dragging when 'top' offset is 0 (content top reached)
      if (!topOffset) {
        e.preventDefault();
      }
    }
  }
});


// ooToggle
Template.ooToggle.created = function() {
  var self = this;
  self.inputId = new Blaze.ReactiveVar(Random.id());
  self.currentValue = new Blaze.ReactiveVar(!!self.data.value);
  self.haveErrors = new Blaze.ReactiveVar(false);
  self.validationCheck = function() {
    return true;
  }
}

Template.ooToggle.helpers({
  ooToggleStyle : function () {
   return this.toggleStyle ? this.toggleStyle : 'brand'
  },
  ooItemTheme : function () {
   return this.itemTheme ? this.itemTheme : 'back:white'
  },
  inputId: function() {
    return Template.instance().inputId.get();
  },
  valueHelper: function() {
    return this.value ? !!this.value : false;
  }
});

Template.ooToggle.events({
  'change input' : function (e, t) {
    t.currentValue.set(e.target.checked);
    var self = this;
    if (self.autoUpdate) {
      var query = {};
      query[self.field] = e.target.checked;
      if (self.checkmark)
        query[self.field + 'Done'] = true

      Collection[self.collection].update({_id: self.docId}, {$set: query})
    }
    // console.log('%c this   ',  'background: #B3CC57; color: white; padding: 1px 15px 1px 5px;', this);
  }
});


// ooChecknark

Template.ooCheckmark.events({
  'click .js-check': function (e) {
    var self = this;
    e.preventDefault();
    e.stopPropagation();
    var query = {}
    query[self.field + 'Done'] = true;
    Collection[self.collection].update({_id: self.docId}, {$set: query})
  },
  'click .js-unCheck': function (e) {
    var self = this;
    e.preventDefault();
    e.stopPropagation();
    var query = {}
    query[self.field + 'Done'] = false;
    Collection[self.collection].update({_id: self.docId}, {$set: query})
  }
});

// ooItemDesription

Template.ooItemDesription.events({
  'click .js-openFroalaEditor' : function (e, t) {
    e.preventDefault();
    e.stopPropagation();
    var self = this;
    Session.set('dirtyDiana', self.dianaId)
    Session.set('froalaEditorOpen', {docId: self.docId, collection: self.collection, fieldName: self.fieldName})
  }
});

// ooPicture2Uri

Template.ooPicture2Uri.created = function () {
  var self = this;
  if (!self.data) {
    console.log('%c ooInput no data passed to component   ',  'background: #5D76DB; color: white; padding: 1px 15px 1px 5px;');
    return
  }
  self.inputId = new Blaze.ReactiveVar(self.data.inputId ? self.data.inputId : Random.id());
};

Template.ooPicture2Uri.helpers({
  inputId: function() {
    return Template.instance().inputId.get();
  },
  imageHelper: function() {
    var image = Images.findOne({_id: this.picture});
    console.log('%c this   ',  'background: #B3CC57; color: white; padding: 1px 15px 1px 5px;', this);
    return image && image.dataUri ? image.dataUri: ""
  }
});

Template.ooPicture2Uri.events({
  'change input': function(e, t) {
    var files = e.target.files;
    var self = this;
    for (var i = 0, f; f = files[i]; i++) {

          // Only process image files.
          if (!f.type.match('image.*')) {
            continue;
          }
          var reader = new FileReader();
          reader.onload = function(e) {
            var dataURL = reader.result;
            // var query = {};
            // query[self.fieldName] = dataURL;
            if (dataURL) {

              Collection.Images.insert({
                  dataUri: dataURL,
                }, function(err, res) {
                  if (err)
                    console.log(err)
                  else if (res) {
                    Collection[self.collection].update({_id: self.docId}, {$set: {pictureId: res}}, function(errSecondary, resSecondary) {
                      if (errSecondary)
                        console.log(errSecondary)
                      else if (resSecondary) {
                        Collection.ImagesTracker.insert({
                          imageId: res,
                          usedBy: self.docId
                        })
                      }
                    })
                  }
                })
            }

          }

          reader.readAsDataURL(f);
        }
  },
})

// ooSelect

Template.ooSelect.helpers({
  selectName : function () {
    var self = this;
    console.log('%c this   ',  'background: #B3CC57; color: white; padding: 1px 15px 1px 5px;', this);
    var record = Collection[self.collection].findOne({_id: self.selectValue});
    return record && record[self.fieldName] ? record[self.fieldName] : (self.noRecordLabel ? self.noRecordLabel : 'No record set')
  }
});

Template.ooSelect.events({
  'click .js-openSelect': function() {
    var self = this;
    SelectModalOpen({activeIndex: self.activeIndex, templateName: self.templateName, collection: self.collection, docId: self.docId, projectId: self.projectId})
  }
});

// ooMultiSelect

Template.ooMultiSelect.helpers({
  templateName: function() {
    return Template.parentData().templateName
  },
  helperClass: function() {
    // console.log('%c this   ',  'background: #B3CC57; color: white; padding: 1px 15px 1px 5px;', this);
    // console.log(Template.parentData(3))

    // console.log('%c end   ',  'background: #5D76DB; color: white; padding: 1px 15px 1px 5px;');
    return 'nnn'
  }
})

Template.ooMultiSelectFamous.helpers({
  templateName: function() {
    return Template.parentData(2).templateName
  },
  helperClass: function() {
    // console.log('%c this   ',  'background: #B3CC57; color: white; padding: 1px 15px 1px 5px;', this);
    // console.log(Template.parentData(3))

    // console.log('%c end   ',  'background: #5D76DB; color: white; padding: 1px 15px 1px 5px;');
    return 'nnn'
  }
})

Template.ooMultiSelectButton.events({
  'click .js-openSelectModal': function(e) {
    e.preventDefault();
    e.stopPropagation();
    var self = this;
    console.log('%c this   ',  'background: #B3CC57; color: white; padding: 1px 15px 1px 5px;', this);
    if (self.agendaTime) {

      Collection.AgendaTimes.insert({
        _id: Random.id(),
        projectId: Session.get('active_Project'),
        starttime: TimeWithISO(moment(new Date())),
        endtime: TimeWithISO(moment(new Date())),
        day: moment(new Date()).format('YYYY-MM-DD'),
        location: '',
        groupEnabled: false,
        groups: [],
        agendaId: self.docId,
        attendedEnabled: false,
        trackEnabled: false,
        map: "",
        appId: Session.get('active_APP'),
        createdAt: new Date(),
        addedSpeakers: [],
      }, function (err, res) {
        if (res) {
          DateSelectModalOpen({collection: 'AgendaTimes', docId: res, multiDate: true, primaryField: 'starttime', secondaryField: 'endtime'})
          Session.set('ticketsForView', {addedAgenda: res})
        }
      })
    } else {
      // Session.set('CMS_activeAgendaTime', self.docId)
      SelectModalOpen({activeIndex: self.activeIndex, templateName: self.templateModal, collection: self.collection, showResultsOnly: self.showResultsOnly, docId: self.docId, collectionParent: self.collectionParent, selectField: self.selectField,parentField: self.parentField})
    }
  }
})

//
//      ooMonthSlider
//

// sessionName, momentFormat
Template.ooMonthSlider.created = function () {
  var self = this;
  self.initialIndexSet = new Blaze.ReactiveVar(false);
  self.scrollView = new Blaze.ReactiveVar(false);
  self.monthsArray = new Blaze.ReactiveVar(['January, 2015', 'February, 2015', 'March, 2015', 'April, 2015', 'May, 2015','June, 2015', 'July, 2015', 'August, 2105', 'September, 2015', 'October, 2015', 'November, 2015', 'December, 2015'])

  var currentMonth = moment().format('MMMM, YYYY');
  self.currentMonth = new Blaze.ReactiveVar(currentMonth);
  var currentIndex = _.indexOf(self.monthsArray.get(), currentMonth);
  self.currentIndex = new Blaze.ReactiveVar(currentIndex);
  self.firstItem = new Blaze.ReactiveVar(false);
  self.lastItem = new Blaze.ReactiveVar(false);


  self.autorun(function() {
    if (self.currentIndex.get() === 0) {
      self.firstItem.set(true)
    } else {
      self.firstItem.set(false)
    }
  });
  self.autorun(function() {
    if (self.currentIndex.get() === self.monthsArray.get().length - 1) {
      self.lastItem.set(true)
    } else {
      self.lastItem.set(false)
    }
  });
  if (self.data && self.data.sessionName) {
    self.autorun(function() {
      var newValue = self.monthsArray.get()[self.currentIndex.get()]
      Session.set(self.data.sessionName, (self.data.momentFormat ? moment(newValue, 'MMMM, YYYY').format(self.data.momentFormat) : newValue))
    })
  }
};

Template.ooMonthSlider.helpers({
  currentValue: function() {
    return Template.instance().monthsArray.get()[Template.instance().currentIndex.get()]
  },
  firstItem: function() {
    return Template.instance().firstItem.get()
  },
  lastItem: function() {
    return Template.instance().lastItem.get()
  }
});

Template.ooMonthSlider.events({
  'click .js-goToPreviuos' : function (e, t) {
    e.preventDefault();
    e.stopPropagation();
    t.currentIndex.set(t.currentIndex.get() - 1)
  },
  'click .js-goToNext' : function (e, t) {
    e.preventDefault();
    e.stopPropagation();
    t.currentIndex.set(t.currentIndex.get() + 1)
  }
});
