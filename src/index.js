import createWorker from './createWorker.js';
import encoder from './wave-encoder.js';

const AudioContext = window.AudioContext || window.webkitAudioContext;

/**
 * Audio Recorder with MediaRecorder API.
 *
 * @param {MediaStream} stream The audio stream to record.
 *
 * @example
 * navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
 *   var recorder = new MediaRecorder(stream)
 * })
 *
 * @class
 */
class MediaRecorder {
  /**
   * The `MediaStream` passed into the constructor.
   * @type {MediaStream}
   */
  constructor(stream) {
    this.mimeType = 'audio/wav';
    this.stream = stream;
    /**
     * The current state of recording process.
     * @type {"inactive"|"recording"|"paused"}
     */
    this.state = 'inactive'
  
    this.em = document.createDocumentFragment()
    this.encoder = createWorker(MediaRecorder.encoder);
  
    const recorder = this
    this.encoder.addEventListener('message', function (e) {
      const event = new Event('dataavailable')
      event.data = new Blob([e.data], { type: recorder.mimeType })
      recorder.em.dispatchEvent(event)
      if (recorder.state === 'inactive') {
        recorder.em.dispatchEvent(new Event('stop'))
      }
    });
  }
  /**
   * Begins recording media.
   *
   * @param {number} [timeslice] The milliseconds to record into each `Blob`.
   *                             If this parameter isn’t included, single `Blob`
   *                             will be recorded.
   *
   * @return {undefined}
   *
   * @example
   * recordButton.addEventListener('click', function () {
    *   recorder.start()
    * })
    */
   start(timeslice) {
     if (this.state === 'inactive') {
       this.state = 'recording'
 
       this.context = new AudioContext()
       var input = this.context.createMediaStreamSource(this.stream)
       var processor = this.context.createScriptProcessor(2048, 1, 1)
 
       var recorder = this
       processor.onaudioprocess = function (e) {
         if (recorder.state === 'recording') {
           recorder.encoder.postMessage([
             'encode', e.inputBuffer.getChannelData(0)
           ])
         }
       }
 
       input.connect(processor)
       processor.connect(this.context.destination)
 
       this.em.dispatchEvent(new Event('start'))
 
       if (timeslice) {
         this.slicing = setInterval(function () {
           if (recorder.state === 'recording') recorder.requestData()
         }, timeslice)
       }
     }
   }
 
   /**
    * Stop media capture and raise `dataavailable` event with recorded data.
    *
    * @return {undefined}
    *
    * @example
    * finishButton.addEventListener('click', function () {
    *   recorder.stop()
    * })
    */
   stop() {
     if (this.state !== 'inactive') {
       this.requestData()
       this.state = 'inactive'
       clearInterval(this.slicing)
     }
   }
 
   /**
    * Pauses recording of media streams.
    *
    * @return {undefined}
    *
    * @example
    * pauseButton.addEventListener('click', function () {
    *   recorder.pause()
    * })
    */
   pause() {
     if (this.state === 'recording') {
       this.state = 'paused'
       this.em.dispatchEvent(new Event('pause'))
     }
   }
 
   /**
    * Resumes media recording when it has been previously paused.
    *
    * @return {undefined}
    *
    * @example
    * resumeButton.addEventListener('click', function () {
    *   recorder.resume()
    * })
    */
   resume() {
     if (this.state === 'paused') {
       this.state = 'recording'
       this.em.dispatchEvent(new Event('resume'))
     }
   }
 
   /**
    * Raise a `dataavailable` event containing the captured media.
    *
    * @return {undefined}
    *
    * @example
    * this.on('nextData', function () {
    *   recorder.requestData()
    * })
    */
   requestData() {
     if (this.state !== 'inactive') {
       this.encoder.postMessage(['dump', this.context.sampleRate])
     }
   }
 
   /**
    * Add listener for specified event type.
    *
    * @param {"start"|"stop"|"pause"|"resume"|"dataavailable"} type Event type.
    * @param {function} listener The listener function.
    *
    * @return {undefined}
    *
    * @example
    * recorder.addEventListener('dataavailable', function (e) {
    *   audio.src = URL.createObjectURL(e.data)
    * })
    */
   addEventListener() {
     this.em.addEventListener.apply(this.em, arguments)
   }
 
   /**
    * Remove event listener.
    *
    * @param {"start"|"stop"|"pause"|"resume"|"dataavailable"} type Event type.
    * @param {function} listener The same function used in `addEventListener`.
    *
    * @return {undefined}
    */
   removeEventListener() {
     this.em.removeEventListener.apply(this.em, arguments)
   }
 
   /**
    * Calls each of the listeners registered for a given event.
    *
    * @param {Event} event The event object.
    *
    * @return {boolean} Is event was no canceled by any listener.
    */
   dispatchEvent() {
     this.em.dispatchEvent.apply(this.em, arguments)
   }
}

/**
 * Returns `true` if the MIME type specified is one the polyfill can record.
 *
 * This polyfill supports only `audio/wav`.
 *
 * @param {string} mimeType The mimeType to check.
 *
 * @return {boolean} `true` on `audio/wav` MIME type.
 */
MediaRecorder.isTypeSupported = function isTypeSupported(mimeType) {
  return /audio\/wave?/.test(mimeType)
}

/**
 * `true` if MediaRecorder can not be polyfilled in the current browser.
 * @type {boolean}
 *
 * @example
 * if (MediaRecorder.notSupported) {
 *   showWarning('Audio recording is not supported in this browser')
 * }
 */
MediaRecorder.notSupported = !navigator.mediaDevices || !AudioContext;
/**
 * Converts RAW audio buffer to compressed audio files.
 * It will be loaded to Web Worker.
 * By default, WAVE encoder will be used.
 * @type {function}
 *
 * @example
 * MediaRecorder.prototype.mimeType = 'audio/ogg'
 * MediaRecorder.encoder = oggEncoder
 */
MediaRecorder.encoder = encoder;

export default MediaRecorder
