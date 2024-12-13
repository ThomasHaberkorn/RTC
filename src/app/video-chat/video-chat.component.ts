import { Component, ElementRef, AfterViewInit, ViewChild } from '@angular/core';

@Component({
  selector: 'app-video-chat',
  standalone: true,
  templateUrl: './video-chat.component.html',
  styleUrls: ['./video-chat.component.scss']
})
export class VideoChatComponent implements AfterViewInit {
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;

  currentOffer: string = '';
  currentIceCandidate: string = '';

  localStream!: MediaStream;
  remoteStream!: MediaStream;
  peerConnection!: RTCPeerConnection;

  async ngAfterViewInit(): Promise<void> {
    await this.startLocalStream();
    this.setupPeerConnection();
  }

  async startLocalStream(): Promise<void> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideoInput = devices.some((device) => device.kind === 'videoinput');
  
      if (!hasVideoInput) {
        throw new Error('Keine Kamera gefunden.');
      }
  
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      this.localVideo.nativeElement.srcObject = this.localStream;
    } catch (error) {
      console.error('Fehler beim Zugriff auf Kamera oder Mikrofon:', error);
    }
  }

  setupPeerConnection(): void {
    this.peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    this.localStream.getTracks().forEach((track) => {
      this.peerConnection.addTrack(track, this.localStream);
    });

    this.peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      this.remoteVideo.nativeElement.srcObject = remoteStream;
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        const candidate = JSON.stringify(event.candidate);
        this.currentIceCandidate += candidate + '\n'; // Kandidat hinzufügen
        console.log(candidate); // Optional: Weiter in der Konsole ausgeben
      }
    };
  }

  async createOffer(): Promise<void> {
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    this.currentOffer = JSON.stringify(offer); // Speichere das Offer
    console.log(this.currentOffer); // Optional: Weiter in der Konsole ausgeben
  }

  async createAnswer(): Promise<void> {
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    console.log(JSON.stringify(answer)); // Nur das JSON ausgeben
  }

  async setRemoteDescription(sdp: RTCSessionDescriptionInit): Promise<void> {
    const remoteDesc = new RTCSessionDescription(sdp);
    await this.peerConnection.setRemoteDescription(remoteDesc);

    // Wenn das SDP ein "offer" ist, antworte mit einem "answer"
    if (sdp.type === 'offer') {
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      console.log('Answer:', JSON.stringify(answer)); // Kopiere dies zurück zum ersten Gerät
    }
  }

  parseSDP(sdp: string): RTCSessionDescriptionInit {
    try {
      // Entferne das Präfix "Offer: " oder "Answer: ", falls vorhanden
      const cleanedSDP = sdp.trim().replace(/^(Offer:|Answer:)\s*/, '');
      return JSON.parse(cleanedSDP);
    } catch (error) {
      console.error('Invalid SDP JSON:', error);
      throw new Error('The provided SDP is not valid JSON.');
    }
  }

  addParsedIceCandidate(candidateInput: string): void {
    const lines = candidateInput.trim().split('\n');
  
    for (const line of lines) {
      if (line.trim()) {
        try {
          const parsedCandidate = JSON.parse(line.trim());
          this.addIceCandidate(parsedCandidate);
        } catch (error) {
          console.error('Invalid ICE Candidate JSON in line:', line, error);
        }
      }
    }
  }
  
  

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    try {
      await this.peerConnection.addIceCandidate(candidate);
      console.log('ICE-Kandidat erfolgreich hinzugefügt:', candidate);
    } catch (error) {
      console.error('Fehler beim Hinzufügen des ICE-Kandidaten:', error);
    }
  }
}
