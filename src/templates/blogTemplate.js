import React from "react";
import { graphql, Link } from "gatsby";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/src/plugin/regions.js";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay } from "@fortawesome/free-solid-svg-icons";
import { faPause } from "@fortawesome/free-solid-svg-icons";

import { colors } from "./colors.js";


export default class Template extends React.Component {
    state = {
        regions: [],
        audioPlaying: false,
        wavesurfer: null,
        loaded: 0
    }

    componentDidMount() {
        const dirname = this.props.data.markdownRemark.frontmatter.path.replace("/podcasts/", "");
        const textFile = require(`../pages/posts/${dirname}/labels.txt`);
        const regions = this.parseLabels(textFile);
        const wavesurfer = WaveSurfer.create({
            barWidth: 3,
            barHeight: 3,
            cursorWidth: 1,
            container: '#waveform',
            backend: 'MediaElement',
            height: 100,
            width: 350,
            progressColor: '#444',
            responsive: true,
            waveColor: '#ccc',
            cursorColor: 'rgb(0,0,0)',
            plugins: [
                RegionsPlugin.create({
                    regions: regions
                })
            ]
        });

        this.setState((state) => ({
            wavesurfer
        }), () => {
            wavesurfer.load(`https://several-people-are-talking.s3.ap-south-1.amazonaws.com/${dirname}/audio.ogg`);
            this.updateDuration();
            this.wavesurferLoadEventManager();
        });
    }

    parseLabels = (textModule) => {
        const content = textModule.default;
        const regionJSON = content.split("\n").map(row => {
            const [start, end, speaker] = row.split(/\s+/);
            const reservedColors = [];
            const color = this.randColor(reservedColors);
            reservedColors.push(color);
            return {
                speaker,
                start,
                end,
                loop: false,
                resize: false,
                drag: false,
                color
            };
        });
        const regions =  regionJSON.slice(0, regionJSON.length - 1);
        this.setState((state) => ({regions}));
        return regions;
    }

    randInt = (ll, ul) => {
        return Math.floor(Math.random() * (ul - ll + 1));
    }

    randColor = (ignore) => {
        const colorPool = colors.filter(color => !ignore.includes(color));
        const size = colorPool.length - 1;
        return colorPool[this.randInt(0, size)];
    }

    getWaveformWidth = () => {
        const el = document.getElementById("podcast-container");
        return el ? el.offsetWidth - 120 : 630;
    }

    playIt = () => {
        this.state.wavesurfer.playPause();
        this.setState((state) => {
            return {audioPlaying: !state.audioPlaying};
        });
    }

    zeroPadding = (number) => {
        return number > 10 ? `${number}` : `0${number}`;
    }

    formatToTime = (s) => {
        const minutes = this.zeroPadding(Math.floor(s / 60));
        const seconds = this.zeroPadding(Math.floor(s % 60));
        return `${minutes}:${seconds}`;
    }

    updateDuration = () => {
        const wavesurfer = this.state.wavesurfer;
        const currentTimeEl = document.getElementById("currenttime");
        const totalTimeEl = document.getElementById("totaltime");
        if (!wavesurfer) {
            currentTimeEl.innerText = "00:00";
            totalTimeEl.innerText = "00:00";
        }
        wavesurfer.on('audioprocess', () => {
            if (wavesurfer.isPlaying()) {
                let totalTime = this.formatToTime(wavesurfer.getDuration().toFixed(2));
                let currentTime = this.formatToTime(wavesurfer.getCurrentTime().toFixed(2));
                currentTimeEl.innerText = `${currentTime}`;
                totalTimeEl.innerText = `${totalTime}`;
            }
        });
    }

    wavesurferLoadEventManager = () => {
        const wavesurfer = this.state.wavesurfer;
        wavesurfer.on("loading", (percent, e) => {
            this.setState((state) => ({
                loaded: percent
            }));
        });
    }

    seekRegion = (idx) => () => {
        console.log(idx);
        const startPoint = this.state.regions[idx].start;
        const totalDuration = this.state.wavesurfer.getDuration();
        this.state.wavesurfer.seekTo(startPoint/totalDuration);
        this.state.wavesurfer.play();
        this.setState((state) => ({
            audioPlaying: true
        }));
    }

    render () {
        const { markdownRemark } = this.props.data;
        const { frontmatter, html } = markdownRemark;
        return (
            <div className="blog-post-container">
              <div className="blog-post">
                <div className="nav-bar">
                  <Link to="/">Home</Link>
                </div>
                <h1>{frontmatter.title}</h1>
                <h2>{frontmatter.date}</h2>
                <div className="audio-control-section">
                  <div className="podcast-container" id="podcast-container">
                    <div>
                      {
                          (this.state.loaded === 100)
                              ? <button className='play-button' onClick={this.playIt}>
                                  {(!this.state.audioPlaying)
                                    ? <FontAwesomeIcon icon={faPlay}/>
                                    : <FontAwesomeIcon icon={faPause}/>}
                                 </button>
                          : ""
                      }
                    </div>

                    <div className="audio-section">
                      <>
                      {
                          (this.state.loaded === 100)
                            ? ""
                          : <div className="loader" style={{width: this.getWaveformWidth(), height: 20}}>
                              <div style={{width: `${this.state.loaded}%`, height: 20}}>{this.state.loaded}%</div>
                            </div>
                      }
                      </>
                      <div style={{ width: this.getWaveformWidth()}} id="waveform"/>
                      <audio
                        id="song"
                        className="audio-el"
                      />
                      <div id="duration">
                        <div id="currenttime">00:00</div>
                        <div id="totaltime">00:00</div>
                      </div>
                    </div>
                  </div>
                  <div className="speaker-legend-container">
                    {
                        (this.state.loaded === 100)
                            ? <ul style={{listStyleType: "none", display: "flex"}} className="speaker-legend">
                              {
                                this.state.regions.map((region, i) => (
                                  <li key={i} onClick={this.seekRegion(i)}>
                                  <span className="legend-icon" style={{background: region.color}}/>
                                    {region.speaker}
                                  </li>
                                ))
                              }
                              </ul>
                        : ""
                    }
                  </div>
                </div>
                <div
                  className="blog-post-content"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </div>
            </div>
        );
    }
}

export const pageQuery = graphql`
  query($path: String!) {
    markdownRemark(frontmatter: { path: { eq: $path }}) {
      html
      frontmatter {
        date(formatString: "MMMM DD, YYYY")
        path
        title
      }
    }
  }
`;
