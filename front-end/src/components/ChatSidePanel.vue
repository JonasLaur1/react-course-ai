<script>
import { sendAIMessage, sendAIAudio } from '@/api/AiAPI';
import hljs from 'highlight.js';
import { nextTick } from 'vue';

export default {
  name: 'ChatSidePanel',
  props: {
    lessonTitle: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      isCollapsed: true,
      userInput: '',
      messages: [],
      contextId: null,
      isClicked: false,
      mediaRecorder: null,
      isTyping: false,
    }
  },
  mounted() {
    nextTick(() => {
      this.highlightCodeInMessages();
    });
  },
  methods: {
    togglePanel() {
      this.isCollapsed = !this.isCollapsed;
    },

    formatMessage(message) {
      return message.replace(
        /```(jsx|javascript|js|html|css)?\n?([\s\S]*?)```/g,
        (_, language, code) => {
          const lang = language || 'jsx'; 
          return `<pre class="code-block"><code class="language-${lang}">${code}</code></pre>`;
        }
      );
    },

    highlightCodeInMessages() {
      nextTick(() => {
        document.querySelectorAll('.message pre code').forEach((block) => {
          hljs.highlightElement(block);
        });
      });
    },

    async handleSubmit() {
      if (!this.userInput.trim()) return;

      const userMessage = this.userInput;
      this.messages.push({ role: 'user', content: userMessage });
      this.userInput = '';

      try {
        let contextInfo = '';
        if (this.lessonTitle) {
          contextInfo = `[Context: Naudotojas šiuo metu atsidaręs React pamoką skaito pamoką (atsižvelk į tai): "${this.lessonTitle}"]`;
        }

        this.isTyping = true;

        const response = await sendAIMessage({
          message: `${contextInfo} \n ${userMessage}`,
          contextId: this.contextId
        });

        this.isTyping = false;

        const formattedReply = this.formatMessage(response.reply);
        this.messages.push({ 
          role: 'assistant', 
          content: formattedReply,
          formatted: true
        });

        if (response.contextId) {
          this.contextId = response.contextId;
        }

        this.highlightCodeInMessages();
      } catch (error) {
        this.isTyping = false;
        this.messages.push({
          role: 'assistant',
          content: 'Atsiprašome, įvyko klaida. Bandykite dar kartą.'
        });
      }
    },

    async startRecording() {
      this.isClicked = true;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      const audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type : 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');

        const response = await sendAIAudio(formData);
        this.messages.push({ role: 'user', content: response.message });

        const responseAI = await sendAIMessage({
          message: response.message,
          contextId: this.contextId
        });
        this.messages.push({ role: 'assistant', content: responseAI.reply });
      }

      this.mediaRecorder.start();
      setTimeout(() => {
        this.mediaRecorder.stop();
        this.isClicked = false;
      }, 10000);
    },

    async stopRecording() {
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
        this.isClicked = false;
      }
    }
  }
}
</script>

<template>
  <div class="chat-container">
    <button class="chat-toggle-button" @click="togglePanel" v-if="isCollapsed">
       <img src="/svg/chat.svg" class="svg"/>
    </button>

    <transition name="slide">
      <div v-if="!isCollapsed" class="chat-panel">
        <div class="chat-header">
          <div style="display: flex; align-items: center;">
            <div class="img-circle">
              <img src="/images/stand.png">
            </div>
            <h2>Komponionas</h2>
          </div>
          <button class="close-button" @click="togglePanel">✕</button>
        </div>

        <div class="messages-container">
          <div v-for="(msg, index) in messages" :key="index" :class="['message', msg.role]">
            <div v-if="msg.formatted" v-html="msg.content"></div>
            <div v-else>{{ msg.content }}</div>
          </div>

          <div v-if="isTyping" class="message-assistant-typing">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>

        <form @submit.prevent="handleSubmit" class="chat-form">
          <button type="button" class="mic-button" @click="startRecording" v-if="!isClicked" id="mic">
            <img src="/svg/mic.svg" class="mic-svg"/>
          </button>
          <button type="button" class="mic-button" @click="stopRecording" v-if="isClicked" id="mic-mute">
            <img src="/svg/mic-mute.svg" class="mic-svg"/>
          </button>
          <input
            v-model="userInput"
            type="text"
            class="chat-input"
            placeholder="Reikia pagalbos?"
          />
          <button type="submit" class="send-button">
            <img src="/svg/send.svg" class="svg"/>
          </button>
        </form>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.mic-button {
  margin-left: 8px;
  cursor: pointer;
  filter: invert(47%) sepia(72%) saturate(467%) hue-rotate(219deg) brightness(88%) contrast(89%);
}

.mic-svg {
  width: 25px; 
  height: 25px;
  margin-right: 10px;
}

.chat-header h2 {
  font-size: 140%;
  color: white;
  margin-left: 10px;
}

.img-circle {
  width: 40px;
  height: 40px;
  border-radius: 100%; 
  overflow: hidden; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
}

.img-circle img {
  width: auto;
  height: 90px; 
  margin-top: 35px;
  object-fit: cover; 
  background-color: white;
}

.svg {
  width: 30px;
  height: 30px;
  filter: invert(1);
}

.chat-container {
  position: relative;
  bottom: 0;
}

.chat-toggle-button {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 56px;
  height: 56px;
  background-color: #916ad5;
  border-radius: 50%;
  cursor: help;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(100%);
}

.chat-panel {
  position: fixed;
  right: 40px;
  bottom: 0;
  right: 0;
  width: 320px;
  padding-right: 10px;
  box-shadow: 0 20px 20px rgba(0, 0, 0, 0.15);
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background-color: #2D2D2D;
  color: white;
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
}

.close-button {
  background: transparent;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #fff;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background-color: #4E4E4E;
  height: 40vh;
  box-shadow: rgba(0, 0, 0, 0.15) 0px 1px 3px 0px inset;
}

.message {
  margin-bottom: 8px;
  word-wrap: break-word;
}

.message.user {
  text-align: left;
  color: black;
  background-color: white;
  padding: 8px;
  border-top-left-radius: 15px;
  border-top-right-radius: 15px;
  border-bottom-left-radius: 15px;
  margin-left: 20px;
}

.message.assistant {
  text-align: left;
  color: white;
  background-color: #916ad5;
  padding: 8px;
  border-top-left-radius: 15px;
  border-top-right-radius: 15px;
  border-bottom-right-radius: 15px;
  margin-right: 20px;
}

.message-assistant-typing {
  background-color: transparent;
  padding: 0;
  margin-right: 20px;
  height: 24px;
  display: flex;
  align-items: center;
}

.message-assistant-typing .dot {
  width: 8px;
  height: 8px;
  margin: 0 4px;
  background-color: #916ad5;
  border-radius: 50%;
  opacity: 0.4;
  animation-name: blink;
  animation-duration: 1.4s;
  animation-iteration-count: infinite;
  animation-fill-mode: both;
}

.message-assistant-typing .dot:nth-child(1) {
  animation-delay: 0s;
}

.message-assistant-typing .dot:nth-child(2) {
  animation-delay: 0.2s;
}

.message-assistant-typing .dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes blink {
  0%, 80%, 100% {
    opacity: 0.4;
  }
  40% {
    opacity: 1;
  }
}

.chat-form {
  display: flex;
  padding: 16px;
  background-color: #2D2D2D;
}

.chat-input {
  flex: 1;
  padding: 5px;
  padding-left: 10px;
  font-size: 14px;
  border-radius: 20px;
}

.send-button {
  margin-left: 8px;
  cursor: pointer;
  filter: invert(47%) sepia(72%) saturate(467%) hue-rotate(219deg) brightness(88%) contrast(89%);
}
</style>

<style>
.code-block {
  background-color: #2d2d2d;
  padding: 8px;
  border-radius: 4px;
  overflow-x: auto;
  font-family: 'Courier New', Courier, monospace;
  font-size: 14px;
  margin: 8px 0;
  border-left: 2px solid #916ad5;
  white-space: pre;
}

.message.assistant code {
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.9em;
}

.message.assistant p {
  margin: 8px 0;
}

.message.assistant a {
  color: #e3d5ff;
  text-decoration: underline;
}
</style>