Template.ooFormButton.events({
  'click button' : function (e, t) {
    var self = this,
      haveErrors = false,
      query = {},
      form = $("#" + e.target.attributes['formId'].value)[0];

    for (var i = form.length - 1; i >= 0; i--) {
      var input = Blaze.getView(form[i])._templateInstance;
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
    query[self.data.field] = self.currentValue.get();
    // for tracking done fields
    if (self.data.checkmark)
      query[self.data.field + 'Done'] = true;

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
  'input input, blur input' : function (e, t) {
    // var self = this;
    // var charLimit = self.charLimit;
    // var currentValueLength = e.currentTarget.value.length;
    // var warningTreshold = charLimit - Math.round(charLimit / 100 * 20); // 20% of the character limit
    t.currentValue.set(e.currentTarget.value);
    t.charCount.set(e.currentTarget.value.length);

    t.validationCheck()

  }
});

Template.ooInput.created = function () {
  var self = this;
  self.inputId = new Blaze.ReactiveVar(Random.id());
  self.currentValue = new Blaze.ReactiveVar(self.data.value);
  self.recordUpdateStatus = new Blaze.ReactiveVar(false);
  self.recordUpdateMessage = new Blaze.ReactiveVar(false);
  self.noticeStatus = new Blaze.ReactiveVar(false);
  self.noticeMessage = new Blaze.ReactiveVar(false);
  self.haveErrors = new Blaze.ReactiveVar(false);
  self.savedValue = new Blaze.ReactiveVar(false);

  self.charCount = new Blaze.ReactiveVar(false);
  self.charLimitStatus = new Blaze.ReactiveVar(false);

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

};

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
  }
});

// ooToggle
Template.ooToggle.created = function () {
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
    var self = this;
    Session.set('dirtyDiana', self.dianaId)
    Session.set('froalaEditorOpen', {docId: self.docId, collection: self.collection, fieldName: self.fieldName})
  }
});

// ooSelect

Template.ooSelect.helpers({
  selectName : function () {
    var self = this;
    console.log('%c this   ',  'background: #B3CC57; color: white; padding: 1px 15px 1px 5px;', this);
    var record = Collection[self.collection].findOne({_id: self.selectValue});
    return record && record[self.fieldName] ? record[self.fieldName] : 'No record set'
  }
});

Template.ooSelect.events({
  'click .js-openSelect': function() {
    var self = this;
    SelectModalOpen({activeIndex: self.activeIndex, templateName: self.templateName, collection: self.collection, docId: self.docId})
  }
});

// ooMultiSelect

Template.ooMultiSelect.created = function () {
  console.log('%c this   ',  'background: #B3CC57; color: white; padding: 1px 15px 1px 5px;', this);
};

Template.ooMultiSelect.helpers({
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
  'click .js-openSelectModal': function() {
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
