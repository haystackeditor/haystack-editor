/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import * as React from "react"

interface SvgProps {
  customStyle?: Record<string, string>
  darkMode?: boolean
  width?: number
  height?: number
}

export function ClassSvg({ customStyle, width, height, darkMode }: SvgProps) {
  return (
    <div style={customStyle}>
      <svg
        width={width ? `${width}px` : "17px"}
        height={height ? `${height}px` : "10px"}
        viewBox="0 0 182 63"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M36.456 0.0799961C41.96 0.0799961 46.408 0.783997 49.8 2.192C53.256 3.6 55.976 5.776 57.96 8.72C59.24 10.704 60.232 12.944 60.936 15.44C61.64 17.936 61.992 20.816 61.992 24.08C61.992 26.896 61.736 29.712 61.224 32.528C60.712 35.344 59.976 38.064 59.016 40.688C58.12 43.248 57 45.68 55.656 47.984C54.376 50.224 52.936 52.208 51.336 53.936C48.328 57.2 44.84 59.504 40.872 60.848C36.968 62.128 32.136 62.768 26.376 62.768C20.808 62.768 16.328 62.192 12.936 61.04C9.544 59.888 6.856 58.032 4.872 55.472C3.464 53.68 2.344 51.408 1.512 48.656C0.744 45.904 0.36 42.448 0.36 38.288C0.36 31.184 1.608 24.848 4.104 19.28C6.664 13.648 10.28 9.2 14.952 5.936C17.768 3.952 20.904 2.48 24.36 1.51999C27.816 0.559996 31.848 0.0799961 36.456 0.0799961ZM25.608 56.048C27.08 56.048 28.456 55.408 29.736 54.128C31.08 52.784 32.296 51.024 33.384 48.848C34.536 46.608 35.56 44.08 36.456 41.264C37.416 38.448 38.216 35.536 38.856 32.528C39.496 29.52 39.976 26.544 40.296 23.6C40.68 20.592 40.872 17.872 40.872 15.44C40.872 12.112 40.52 9.84 39.816 8.62399C39.176 7.344 38.216 6.704 36.936 6.704C35.464 6.704 34.056 7.344 32.712 8.62399C31.368 9.904 30.088 11.632 28.872 13.808C27.72 15.92 26.664 18.384 25.704 21.2C24.808 23.952 24.008 26.8 23.304 29.744C22.664 32.688 22.152 35.6 21.768 38.48C21.448 41.36 21.288 44.016 21.288 46.448C21.288 50.096 21.672 52.624 22.44 54.032C23.272 55.376 24.328 56.048 25.608 56.048ZM121.567 14.96C121.567 16.816 121.279 18.48 120.703 19.952C120.191 21.424 119.455 22.736 118.495 23.888C117.535 25.04 116.415 26.064 115.135 26.96C113.855 27.856 112.447 28.688 110.911 29.456C111.615 29.712 112.447 30.128 113.407 30.704C114.367 31.216 115.295 31.952 116.191 32.912C117.087 33.872 117.823 35.12 118.399 36.656C119.039 38.128 119.359 39.952 119.359 42.128C119.359 45.008 118.751 47.664 117.535 50.096C116.319 52.528 114.495 54.64 112.063 56.432C109.695 58.16 106.751 59.536 103.231 60.56C99.7748 61.52 95.7748 62 91.2308 62H62.7188L75.6788 1.04H100.927C103.423 1.04 105.887 1.232 108.319 1.616C110.815 1.936 113.023 2.608 114.943 3.632C116.927 4.656 118.527 6.096 119.743 7.952C120.959 9.744 121.567 12.08 121.567 14.96ZM95.4548 26.576C96.8628 26.576 98.0468 26.16 99.0068 25.328C100.031 24.496 100.863 23.472 101.503 22.256C102.143 20.976 102.623 19.632 102.943 18.224C103.263 16.752 103.423 15.44 103.423 14.288C103.423 12.432 102.975 10.864 102.079 9.584C101.247 8.24 99.9028 7.568 98.0468 7.568H95.1668L91.0388 26.576H95.4548ZM88.5428 55.952C90.4628 55.952 92.0628 55.408 93.3428 54.32C94.6228 53.232 95.6788 51.888 96.5108 50.288C97.3428 48.688 97.9188 47.024 98.2388 45.296C98.6228 43.504 98.8148 41.936 98.8148 40.592C98.8148 38.352 98.3348 36.592 97.3748 35.312C96.4788 33.968 95.0068 33.296 92.9588 33.296H89.4068L84.7028 55.952H88.5428ZM123.782 39.44H141.83C141.83 39.632 141.734 40.112 141.542 40.88C141.414 41.584 141.254 42.448 141.062 43.472C140.87 44.496 140.678 45.616 140.486 46.832C140.358 48.048 140.294 49.168 140.294 50.192C140.294 50.832 140.358 51.504 140.486 52.208C140.614 52.912 140.838 53.584 141.158 54.224C141.478 54.8 141.926 55.312 142.502 55.76C143.142 56.144 143.91 56.336 144.806 56.336C146.47 56.336 147.782 55.664 148.742 54.32C149.766 52.912 150.662 50.384 151.43 46.736L161.126 1.04H181.958L172.55 45.104C171.718 48.88 170.278 51.952 168.23 54.32C166.182 56.624 163.814 58.416 161.126 59.696C158.502 60.976 155.686 61.808 152.678 62.192C149.67 62.64 146.79 62.864 144.038 62.864C140.838 62.864 138.086 62.64 135.782 62.192C133.478 61.808 131.43 61.232 129.638 60.464C127.91 59.696 126.342 58.768 124.934 57.68C123.526 56.528 122.117 55.28 120.709 53.936L123.782 39.44Z"
          fill={darkMode ? "white" : "black"}
        />
      </svg>
    </div>
  )
}

export function FunctionSvg({
  customStyle,
  width,
  height,
  darkMode,
}: SvgProps) {
  return (
    <div style={customStyle}>
      <svg
        width={width ? `${width}px` : "10px"}
        height={height ? `${height}px` : "13px"}
        viewBox="0 0 66 86"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M1.512 25.72H8.904L9.768 21.784C10.6 17.944 11.816 14.712 13.416 12.088C15.016 9.4 16.904 7.224 19.08 5.56C21.32 3.896 23.848 2.712 26.664 2.008C29.48 1.24 32.488 0.855999 35.688 0.855999C37.672 0.855999 39.784 0.983997 42.024 1.23999C44.264 1.49599 46.6 1.91199 49.032 2.488L47.496 10.168C46.088 9.976 44.584 9.848 42.984 9.784C41.384 9.656 40.104 9.592 39.144 9.592C37.864 9.592 36.744 9.688 35.784 9.88C34.888 10.072 34.088 10.456 33.384 11.032C32.68 11.544 32.072 12.28 31.56 13.24C31.048 14.2 30.632 15.48 30.312 17.08L28.488 25.72H38.568L37.32 32.152H27.144L19.752 67H0.168L7.56 32.152H0.0720001L1.512 25.72ZM53.3229 67.7408L59.3709 61.232H65.9949L55.5693 71.9456L62.9997 86H50.7885L46.7565 78.3968L39.1533 86H32.5293L44.5677 74.2496L37.7133 61.232H49.8669L53.3229 67.7408Z"
          fill={darkMode ? "white" : "black"}
        />
      </svg>
    </div>
  )
}

export function VariableSvg({
  customStyle,
  width,
  height,
  darkMode,
}: SvgProps) {
  return (
    <div style={customStyle}>
      <svg
        width={width ? `${width}px` : "15px"}
        height={height ? `${height}px` : "10px"}
        viewBox="0 0 124 61"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M41.152 19.24L55.84 0.0399952H67.36L44.608 27.4L58.912 61H35.2L27.04 41.896L12.256 61H0.736L23.392 33.256L9.28 0.0399952H32.992L41.152 19.24ZM99.094 37.96L94.198 61H73.366L78.646 36.328L69.238 0.0399952H92.278L98.806 24.136L113.206 0.0399952H123.574L99.094 37.96Z"
          fill={darkMode ? "white" : "black"}
        />
      </svg>
    </div>
  )
}

export function FileSvg({ customStyle, darkMode }: SvgProps) {
  return (
    <div style={customStyle}>
      <svg
        width="20px"
        height="10px"
        viewBox="0 0 179 61"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12.96 0.0399952H53.376L51.84 7.336H32.16L28.416 24.904H44.832L43.296 32.296H26.88L20.736 61H0L12.96 0.0399952ZM67.8923 61H47.1562L60.1163 0.0399952H80.9483L67.8923 61ZM91.4288 0.0399952H112.261L100.933 52.936H120.421L118.789 61H78.4688L91.4288 0.0399952ZM137.741 0.0399952H178.157L176.621 7.336H157.037L153.005 25.864H169.421L167.885 33.064H151.469L147.053 53.608H166.637L165.197 61H124.781L137.741 0.0399952Z"
          fill={darkMode ? "white" : "black"}
        />
      </svg>
    </div>
  )
}

export function ChevronDown({ customStyle, darkMode }: SvgProps) {
  return (
    <div style={customStyle}>
      <svg
        width="10px"
        height="8px"
        viewBox="0 0 14 8"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M6.74039 7.75961L14 1L13.3185 0.26814L6.77511 6.3609L0.707107 0.292893L0 1L6.48047 7.48047L6.74039 7.75961Z"
          fill={darkMode ? "white" : "black"}
        />
      </svg>
    </div>
  )
}

export function ChevronUp({ customStyle, darkMode }: SvgProps) {
  return (
    <div style={customStyle}>
      <svg
        width="10px"
        height="8px"
        viewBox="0 0 14 8"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M7.25961 1.22184e-05L0 6.75962L0.681455 7.49149L7.22489 1.39873L13.2929 7.46673L14 6.75963L7.51953 0.279159L7.25961 1.22184e-05Z"
          fill={darkMode ? "white" : "black"}
        />
      </svg>
    </div>
  )
}

export function ChevronRight({ customStyle, darkMode }: SvgProps) {
  return (
    <div style={customStyle}>
      <svg
        width="15px"
        height="8px"
        viewBox="0 0 8 15"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M7.74575 8.00534L0.986133 0.745728L0.254272 1.42718L6.34703 7.97062L0.279026 14.0386L0.986133 14.7457L7.4666 8.26526L7.74575 8.00534Z"
          fill={darkMode ? "white" : "black"}
        />
      </svg>
    </div>
  )
}

export function EditCodeIcon({ customStyle }: SvgProps) {
  return (
    <div style={customStyle}>
      <svg
        width="15px"
        height="10px"
        viewBox="0 0 15 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M5 12L0 5.67383L0.216881 5.50241L0.200532 5.48812L5 0L6.50551 1.3166L2.61846 5.76138L6.56908 10.7598L5 12ZM9.13817 0L14.1382 6.32617L13.9213 6.49759L13.9376 6.51188L9.13817 12L7.63266 10.6834L11.5197 6.23862L7.56908 1.24015L9.13817 0Z"
          fill="black"
        />
      </svg>
    </div>
  )
}

export function OutgoingDepIcon({ customStyle }: SvgProps) {
  return (
    <div style={customStyle}>
      <svg
        width="15px"
        height="10px"
        viewBox="0 0 34 23"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M32.6857 12.5607C33.2714 11.9749 33.2714 11.0251 32.6857 10.4393L23.1397 0.893398C22.5539 0.307611 21.6042 0.307611 21.0184 0.893398C20.4326 1.47919 20.4326 2.42893 21.0184 3.01472L29.5037 11.5L21.0184 19.9853C20.4326 20.5711 20.4326 21.5208 21.0184 22.1066C21.6042 22.6924 22.5539 22.6924 23.1397 22.1066L32.6857 12.5607ZM0.375 13L31.625 13V10L0.375 10V13Z"
          fill="black"
          fillOpacity="0.5"
        />
      </svg>
    </div>
  )
}

export function IncomingDepIcon({ customStyle }: SvgProps) {
  return (
    <div style={customStyle}>
      <svg
        width="15px"
        height="10px"
        viewBox="0 0 34 23"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M1.31434 10.4393C0.728553 11.0251 0.728553 11.9749 1.31434 12.5607L10.8603 22.1066C11.4461 22.6924 12.3958 22.6924 12.9816 22.1066C13.5674 21.5208 13.5674 20.5711 12.9816 19.9853L4.49632 11.5L12.9816 3.01472C13.5674 2.42893 13.5674 1.47918 12.9816 0.893398C12.3958 0.307612 11.4461 0.307612 10.8603 0.893398L1.31434 10.4393ZM33.625 10L2.375 10V13L33.625 13V10Z"
          fill="black"
          fillOpacity="0.5"
        />
      </svg>
    </div>
  )
}

export function CautionSvg({ customStyle }: SvgProps) {
  return (
    <div style={customStyle}>
      <svg
        width="72px"
        height="65px"
        viewBox="0 0 72 65"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M27.3397 5C31.1887 -1.66666 40.8112 -1.66667 44.6603 5L70.641 50C74.49 56.6667 69.6788 65 61.9808 65H10.0192C2.32124 65 -2.49002 56.6667 1.35898 50L27.3397 5Z"
          fill="#FFE600"
        />
        <path
          d="M44 50C44 54.4183 40.4183 58 36 58C31.5817 58 28 54.4183 28 50C28 45.5817 31.5817 42 36 42C40.4183 42 44 45.5817 44 50Z"
          fill="white"
        />
        <path
          d="M31 15C31 12.2386 33.2386 10 36 10C38.7614 10 41 12.2386 41 15V33C41 35.7614 38.7614 38 36 38C33.2386 38 31 35.7614 31 33V15Z"
          fill="white"
        />
      </svg>
    </div>
  )
}

export function SymbolParentSvg({ customStyle }: SvgProps) {
  return (
    <div style={customStyle}>
      <svg
        width="10px"
        height="10px"
        viewBox="0 0 200 125"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M0 0H200V50H0V0ZM0 75H78V125H0V75ZM200 75H122V125H200V75Z"
          fill="black"
        />
      </svg>
    </div>
  )
}

export function DocumentSvg({ customStyle }: SvgProps) {
  return (
    <div style={customStyle}>
      <svg
        width="10px"
        height="10px"
        viewBox="0 0 113 130"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <mask id="path-1-inside-1_92_14" fill="white">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M0 26.4289L1.46447 24.9645L24.9645 1.46447L26.4289 0H28.5H108H113V5V125V130H108H5H0V125V28.5V26.4289ZM26.5 7L7 26.5H26.5V7ZM5 120V31.5H29H31.5V29V5H103H108V10V120V125H103H10H5V120ZM101 45H10V50H101V45ZM10 67H101V72H10V67ZM101 89H10V94H101V89Z"
          />
        </mask>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M0 26.4289L1.46447 24.9645L24.9645 1.46447L26.4289 0H28.5H108H113V5V125V130H108H5H0V125V28.5V26.4289ZM26.5 7L7 26.5H26.5V7ZM5 120V31.5H29H31.5V29V5H103H108V10V120V125H103H10H5V120ZM101 45H10V50H101V45ZM10 67H101V72H10V67ZM101 89H10V94H101V89Z"
          fill="black"
        />
        <path
          d="M0 26.4289L-7.07107 19.3579L-10 22.2868V26.4289H0ZM26.4289 0V-10H22.2868L19.3579 -7.07107L26.4289 0ZM113 0H123V-10H113V0ZM113 130V140H123V130H113ZM0 130H-10V140H0V130ZM7 26.5L-0.0710678 19.4289L-17.1421 36.5H7V26.5ZM26.5 7H36.5V-17.1421L19.4289 -0.0710678L26.5 7ZM26.5 26.5V36.5H36.5V26.5H26.5ZM5 31.5V21.5H-5V31.5H5ZM31.5 31.5V41.5H41.5V31.5H31.5ZM31.5 5V-5H21.5V5H31.5ZM108 5H118V-5H108V5ZM108 125V135H118V125H108ZM5 125H-5V135H5V125ZM10 45V35H0V45H10ZM101 45H111V35H101V45ZM10 50H0V60H10V50ZM101 50V60H111V50H101ZM101 67H111V57H101V67ZM10 67V57H0V67H10ZM101 72V82H111V72H101ZM10 72H0V82H10V72ZM10 89V79H0V89H10ZM101 89H111V79H101V89ZM10 94H0V104H10V94ZM101 94V104H111V94H101ZM-5.6066 17.8934L-7.07107 19.3579L7.07107 33.5L8.53553 32.0355L-5.6066 17.8934ZM17.8934 -5.6066L-5.6066 17.8934L8.53553 32.0355L32.0355 8.53553L17.8934 -5.6066ZM19.3579 -7.07107L17.8934 -5.6066L32.0355 8.53553L33.5 7.07107L19.3579 -7.07107ZM28.5 -10H26.4289V10H28.5V-10ZM108 -10H28.5V10H108V-10ZM113 -10H108V10H113V-10ZM123 5V0H103V5H123ZM123 125V5H103V125H123ZM123 130V125H103V130H123ZM108 140H113V120H108V140ZM5 140H108V120H5V140ZM0 140H5V120H0V140ZM-10 125V130H10V125H-10ZM-10 28.5V125H10V28.5H-10ZM-10 26.4289V28.5H10V26.4289H-10ZM14.0711 33.5711L33.5711 14.0711L19.4289 -0.0710678L-0.0710678 19.4289L14.0711 33.5711ZM26.5 16.5H7V36.5H26.5V16.5ZM16.5 7V26.5H36.5V7H16.5ZM-5 31.5V120H15V31.5H-5ZM29 21.5H5V41.5H29V21.5ZM31.5 21.5H29V41.5H31.5V21.5ZM21.5 29V31.5H41.5V29H21.5ZM21.5 5V29H41.5V5H21.5ZM103 -5H31.5V15H103V-5ZM108 -5H103V15H108V-5ZM118 10V5H98V10H118ZM118 120V10H98V120H118ZM118 125V120H98V125H118ZM103 135H108V115H103V135ZM10 135H103V115H10V135ZM5 135H10V115H5V135ZM-5 120V125H15V120H-5ZM10 55H101V35H10V55ZM20 50V45H0V50H20ZM101 40H10V60H101V40ZM91 45V50H111V45H91ZM101 57H10V77H101V57ZM111 72V67H91V72H111ZM10 82H101V62H10V82ZM0 67V72H20V67H0ZM10 99H101V79H10V99ZM20 94V89H0V94H20ZM101 84H10V104H101V84ZM91 89V94H111V89H91Z"
          fill="black"
          mask="url(#path-1-inside-1_92_14)"
        />
      </svg>
    </div>
  )
}

export function FolderSvg({ customStyle }: SvgProps) {
  return (
    <div style={customStyle}>
      <svg
        width="10px"
        height="10px"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <title />

        <g id="Complete">
          <g id="folder">
            <path
              d="M2,18.8V5.3A2.3,2.3,0,0,1,4.3,3H9.6a1.1,1.1,0,0,1,.8.4l2.8,3.2a1.1,1.1,0,0,0,.8.4h5.6A2.2,2.2,0,0,1,22,9.2v9.7A2.2,2.2,0,0,1,19.8,21H4.2A2.2,2.2,0,0,1,2,18.8Z"
              fill="none"
              stroke="#000000"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </g>
        </g>
      </svg>
    </div>
  )
}

export function SmallFileSvg({
  customStyle,
  width,
  height,
  darkMode,
}: SvgProps) {
  return (
    <div style={customStyle}>
      <svg
        width={width ? `${width}px` : "10px"}
        height={height ? `${height}px` : "10px"}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <title />

        <g id="Complete">
          <g id="F-File">
            <g id="Text">
              <g>
                <path
                  d="M18,22H6a2,2,0,0,1-2-2V4A2,2,0,0,1,6,2h7.1a2,2,0,0,1,1.5.6l4.9,5.2A2,2,0,0,1,20,9.2V20A2,2,0,0,1,18,22Z"
                  fill="none"
                  id="File"
                  stroke={darkMode ? "#ffffff" : "#000000"}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />

                <line
                  fill="none"
                  stroke={darkMode ? "#ffffff" : "#000000"}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  x1="7.9"
                  x2="16.1"
                  y1="17.5"
                  y2="17.5"
                />

                <line
                  fill="none"
                  stroke={darkMode ? "#ffffff" : "#000000"}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  x1="7.9"
                  x2="16.1"
                  y1="13.5"
                  y2="13.5"
                />

                <line
                  fill="none"
                  stroke={darkMode ? "#ffffff" : "#000000"}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  x1="8"
                  x2="13"
                  y1="9.5"
                  y2="9.5"
                />
              </g>
            </g>
          </g>
        </g>
      </svg>
    </div>
  )
}

export function FolderClosedSvg({ customStyle }: SvgProps) {
  return (
    <div style={customStyle}>
      <svg
        width="10px"
        height="10px"
        viewBox="-4.5 0 20 20"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
      >
        <title>arrow_right [#333]</title>
        <desc>Created with Sketch.</desc>
        <defs></defs>
        <g
          id="Page-1"
          stroke="none"
          strokeWidth="1"
          fill="none"
          fillRule="evenodd"
        >
          <g
            id="Dribbble-Light-Preview"
            transform="translate(-425.000000, -6679.000000)"
            fill="#000000"
          >
            <g id="icons" transform="translate(56.000000, 160.000000)">
              <path
                d="M370.39,6519 L369,6520.406 L377.261,6529.013 L376.38,6529.931 L376.385,6529.926 L369.045,6537.573 L370.414,6539 C372.443,6536.887 378.107,6530.986 380,6529.013 C378.594,6527.547 379.965,6528.976 370.39,6519"
                id="arrow_right-[#333]"
              ></path>
            </g>
          </g>
        </g>
      </svg>
    </div>
  )
}

export function FolderOpenSvg({ customStyle }: SvgProps) {
  return (
    <div style={customStyle}>
      <svg
        fill="#000000"
        height="10px"
        width="10px"
        version="1.1"
        id="Layer_1"
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        viewBox="0 0 407.437 407.437"
        xmlSpace="preserve"
      >
        <polygon points="386.258,91.567 203.718,273.512 21.179,91.567 0,112.815 203.718,315.87 407.437,112.815 " />
      </svg>
    </div>
  )
}

export function VerticalLineSvg({ customStyle }: SvgProps) {
  return (
    <div style={customStyle}>
      <svg
        width="20px"
        height="20px"
        viewBox="0 0 10 10"
        xmlns="http://www.w3.org/2000/svg"
      >
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="10"
          stroke="black"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  )
}

export function CloseSvg({ customStyle, width, height }: SvgProps) {
  return (
    <div style={customStyle}>
      <svg
        width={`${width ?? 10}px`}
        height={`${height ?? 10}px`}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M5 5L19 19M5 19L19 5"
          stroke="#000000"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

export function DirtyFileSvg({ customStyle, width, height }: SvgProps) {
  return (
    <div style={customStyle}>
      <svg
        width={`${width ?? 10}px`}
        height={`${height ?? 10}px`}
        viewBox="0 0 60 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="30" cy="30" r="25" fill="black" />
      </svg>
    </div>
  )
}
