import $ from 'jquery'
import recursiveAssign from './recursiveAssign'
import {
  makeRatioImgDataURI,
  dataURItoBlob,
  blobtoDataURL
} from './helpers'

if ($.fn) {

  // Bootstrap plugin - Modal
  $.fn.bsModal = function (options) {

    let defaults = {

      // Basic
      id: 'exampleModal',
      title: 'Modal title',
      titleLavel: 5,
      body: '',

      // Advanced
      label: null,
      lang: null,
      langs: {
        'en': {
          okBtn: {
            text: 'Save'
          },
          cancelBtn: {
            text: 'Close'
          },
          confirmOkText: 'OK',
          confirmCancelText: 'Cancel'
        },
        'zh-TW': {
          okBtn: {
            text: '儲存'
          },
          cancelBtn: {
            text: '關閉'
          },
          confirmOkText: '確定',
          confirmCancelText: '取消'
        }
      },

      // Modal selector
      modal: null,
      fade: true,
      close: true,
      backdrop: true,
      confirm: false,

      // Button
      okBtn: {
        text: '',
        color: 'primary'
      },
      cancelBtn: {
        text: '',
        color: 'secondary'
      },

      // Text
      confirmOkText: '',
      confirmCancelText: '',

      // Event
      onOpen: () => { return true },
      onClose: () => { return true },
      onOk: () => { return true },
      onCancel: () => { return true }

    }

    // Locale
    const locale = defaults.langs[defaults.lang]
      || defaults.langs[
        navigator.language ||
        navigator.userLanguage
      ]
      || defaults.langs['en']
    defaults = recursiveAssign({}, defaults, locale)

    // Settings
    let settings = recursiveAssign({}, defaults, options)
    settings.label = settings.label || `${settings.id}Label`

    if (typeof options.close === 'undefined') {
      settings.close = false
    }
    if (typeof options.backdrop === 'undefined') {
      settings.backdrop = 'static'
    }

    let modal = null

    // Existence modal
    if (typeof settings.modal === 'string') {
      modal = $(settings.modal)
    }

    // Create modal
    if (modal === null) {
      modal = $('<div class="modal" />')
        .addClass(settings.fade ? 'fade' : '')
        .attr({
          id: settings.id,
          tabindex: '-1',
          role: 'dialog',
          'aria-labelledby': settings.label,
          'data-backdrop': settings.backdrop
        })
        .appendTo('body')

      let modalDialog = $('<div class="modal-dialog" />')
        .attr({ role: 'document' })
        .appendTo(modal)

      let modalContent = $('<div class="modal-content" />')
        .appendTo(modalDialog)

      let modalHeader = $('<div class="modal-header" />')
        .appendTo(modalContent)

      $(`<h${settings.titleLavel} class="modal-title" />`)
        .attr('id', settings.label)
        .html(settings.title)
        .css('display', 'inline')
        .appendTo(modalHeader)

      if (settings.close) {
        $('<button class="close" type="button" data-dismiss="modal" aria-label="Close" />')
          .append($('<span aria-hidden="true">&times;</span>'))
          .appendTo(modalHeader)
      }

      if (settings.body) {
        $('<div class="modal-body" />')
          .html(settings.body)
          .appendTo(modalContent)
      }

      let modalFooter
      let cancelBtn
      let okBtn

      if (settings.cancelBtn || settings.okBtn) {
        modalFooter = $('<div class="modal-footer" />')
          .appendTo(modalContent)

        if (settings.cancelBtn) {
          cancelBtn = $('<button type="button" data-dismiss="modal" />')
            .addClass(`btn btn-${settings.cancelBtn.color}`)
            .text(
              !settings.confirm
                ? settings.cancelBtn.text
                : settings.confirmCancelText
            )
            .appendTo(modalFooter)
        }

        if (settings.okBtn) {
          okBtn = $('<button type="button" />')
            .addClass(`btn btn-${settings.okBtn.color}`)
            .text(
              !settings.confirm
                ? settings.okBtn.text
                : settings.confirmOkText
            )
            .appendTo(modalFooter)
        }
      }

      // Event

      modal.on('shown.bs.modal', () => {
        settings.onOpen.call(this)
      })

      modal.on('hidden.bs.modal', () => {
        settings.onClose.call(this)
      })

      if (okBtn) {
        okBtn.on('click', () => {
          if (settings.onOk.call(this) === false) {
            return
          }
          modal.modal('hide')
        })
      }

      if (cancelBtn) {
        cancelBtn.on('click', () => {
          settings.onCancel.call(this)
        })
      }

    }

    // Set modal to public
    this.modal = modal

    // Add this button data-toggle
    this.attr({
      'data-toggle': 'modal',
      'data-target': `#${modal.attr('id')}`
    })

    return this

  }

  // Bootstrap plugin - Cropper image modal
  $.fn.bsModalCropper = function (options) {

    if (typeof Cropper === 'undefined') {
      throw 'Error: Cropper.js is not found.'
    }

    let defaults = {

      // Basic
      id: 'exampleModalCropper',

      // Modal settings
      confirm: true,

      // image src
      src: null,
      imgId: 'exampleImage',

      // Cropper.js options
      cropper: {
        viewMode: 1
      },
      maxWidth: null,
      maxHeight: null,
      imageMimeType: 'auto',

      // Upload
      uploadFile: null,
      action: null,
      method: 'post',
      fileName: 'file',
      data: {},
      uploadConfig: {
        allowTypes: [
          'image/jpeg',
          'image/png'
        ],
        maxSize: Math.pow(1024, 2) * 5 // 5M
      },
      success: () => { },
      error: () => { },

      // Axios
      axios: null,
      axiosOriginalData: false,

      // Event
      onUpload: () => { return true },
      onUploadError: () => { return true },
      onCropper: () => { return true }

    }

    let settings = recursiveAssign({}, defaults, options)

    /**
     * @var {*} image Cropper image DOM
     */
    let image = $('<img />')
      .attr('id', settings.imgId)
      .css('max-width', '100%')

    /**
     * @var {*} cropper Cropper object
     */
    let cropper

    settings.body = $('<div class="img-container" />').append(image)

    const onOpen = settings.onOpen
    settings.onOpen = () => {
      if (settings.imageMimeType === 'auto') {
        try {
          // check is is base64 or not (throw exception)
          atob(settings.src.split(',')[1])
  
          // is base64
          settings.imageMimeType = settings.src.split(':')[1].split(';')[0]
        } catch (error) {
          if (error instanceof DOMException) {
            // is image
            const mimetypeMap = {
              jpg: 'image/jpeg',
              jpeg: 'image/jpeg',
              png: 'image/png',
              gif: 'image/gif',
              svg: 'image/svg+xml',
              webp: 'image/webp',
            }
            const m = settings.src.match(/\.(\w+)$/)
            settings.imageMimeType = mimetypeMap[m && m[1]]
          }
        }

        // If guess is not working, return the default mime-type
        if (settings.imageMimeType === 'auto') {
          settings.imageMimeType = 'image/jpeg'
        }
      }

      cropper = new Cropper(image.get(0), settings.cropper)
      if (onOpen) onOpen()
    }

    const onOk = settings.onOk
    settings.onOk = () => {
      if (onOk) onOk()

      const croppedDataURL = cropper.getCroppedCanvas().toDataURL(settings.imageMimeType)
      cropper.destroy()

      // Renew image size
      makeRatioImgDataURI(croppedDataURL, {
        width: settings.maxWidth,
        height: settings.maxHeight
      }, dataURI => {
        const blob = dataURItoBlob(dataURI)

        // Cropper image event
        settings.onCropper.call(this, dataURI, blob, settings.uploadFile)

        if (typeof settings.action === 'string') {
          // Upload image to server
          const formData = new FormData()

          // Upload file
          formData.append(settings.fileName, blob)

          // Upload data
          Object.keys(settings.data).forEach(key => {
            formData.append(key, settings.data[key])
          })

          // Use ajax post to server
          ajax(settings, formData)
        }
      })
    }

    const onCancel = settings.onCancel
    settings.onCancel = () => {
      cropper.destroy()
      if (onCancel) onCancel()
    }

    if (settings.src) {
      image.attr('src', settings.src)

      // Clear uploaded file
      settings.uploadFile = null

      this.bsModal(settings)
    } else {
      // Upload image to browser

      /**
       * @var {object} inputFile Input file DOM
       */
      let inputFile = this.children('input[type=file]').get(0)

      inputFile.onchange = () => {
        if (!inputFile.files.length) {
          return
        }

        /**
         * @var {File} file Upload file - image
         */
        let file = inputFile.files[0]

        // Uploaded file
        settings.uploadFile = file

        // Uploaded clear image
        inputFile.value = ''

        if (settings.onUpload.call(this, settings.uploadFile) === false) {
          return
        }

        if (settings.uploadConfig.allowTypes) {
          /**
           * @var {array} allowTypes
           */
          const allowTypes = settings.uploadConfig.allowTypes
          if (!allowTypes.some(v => v === file.type)) {
            settings.onUploadError.call(this, 'Upload file type is wrong')
            return
          }
        }

        // Validate image max size
        if (settings.uploadConfig.maxSize) {
          /**
           * @var {number} maxSize
           */
          const maxSize = settings.uploadConfig.maxSize
          if (file.size > maxSize) {
            const i = Math.floor(Math.log(maxSize) / Math.log(1024))
            const maxSizeText = (maxSize / Math.pow(1024, i) ).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i]
            settings.onUploadError.call(this, `Uploaded file cannot be larger than ${maxSizeText}`)
            return
          }
        }

        blobtoDataURL(file, dataURL => {
          settings.src = dataURL
          image.attr('src', settings.src)

          // Call modal
          this.bsModal(settings)
          this.modal.modal('show')

          // Remove this button data-toggle
          this.removeAttr('data-toggle').removeAttr('data-target')
        })
      }
    }

    /**
     * Ajax function
     * @param {object} settings
     * @param {FormData} formData
     */
    function ajax(settings, formData) {
      if (settings.axios) {
        // Use axios
        settings.axios({
          url: settings.action,
          method: settings.method,
          data: formData,
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }).then(res => {
          settings.success(settings.axiosOriginalData ? res : res.data)
        }).catch(settings.error)

      } else if (typeof $.ajax !== 'undefined') {
        // Use jquery ajax
        $.ajax(settings.action, {
          method: settings.method,
          data: formData,
          processData: false,
          contentType: false,
          success: settings.success,
          error: settings.error
        })

      } else {
        throw 'Error: ajax function is not found, Can\'t upload image.'
      }
    }

    return this

  }

}
