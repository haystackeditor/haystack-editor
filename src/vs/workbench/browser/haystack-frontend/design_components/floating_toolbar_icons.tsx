/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import * as React from "react"
import "vs/css!./design_components"

interface SvgProps {
  customStyle?: Record<string, string>
  width?: number
  height?: number
}

export function DeepSymbolSvg({ customStyle }: SvgProps) {
  return (
    <div className="floatingToolbarIcon" style={customStyle}>
      <svg
        width="15px"
        height="15px"
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

export function FileSvg({ customStyle }: SvgProps) {
  return (
    <div className="floatingToolbarIcon" style={customStyle}>
      <svg
        width="15px"
        height="15px"
        viewBox="0 0 113 130"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <mask id="path-1-inside-1_110_2" fill="white">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M1.46447 24.9645L0 26.4289V28.5V125V130H5H108H113V125V5V0H108H28.5H26.4289L24.9645 1.46447L1.46447 24.9645ZM7 26.5L26.5 7V26.5H7ZM5 31.5V120V125H10H103H108V120V10V5H103H31.5V29V31.5H29H5Z"
          />
        </mask>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M1.46447 24.9645L0 26.4289V28.5V125V130H5H108H113V125V5V0H108H28.5H26.4289L24.9645 1.46447L1.46447 24.9645ZM7 26.5L26.5 7V26.5H7ZM5 31.5V120V125H10H103H108V120V10V5H103H31.5V29V31.5H29H5Z"
          fill="black"
        />
        <path
          d="M0 26.4289L-7.07107 19.3579L-10 22.2868V26.4289H0ZM0 130H-10V140H0V130ZM113 130V140H123V130H113ZM113 0H123V-10H113V0ZM26.4289 0V-10H22.2868L19.3579 -7.07107L26.4289 0ZM26.5 7H36.5V-17.1421L19.4289 -0.0710678L26.5 7ZM7 26.5L-0.0710678 19.4289L-17.1421 36.5H7V26.5ZM26.5 26.5V36.5H36.5V26.5H26.5ZM5 31.5V21.5H-5V31.5H5ZM5 125H-5V135H5V125ZM108 125V135H118V125H108ZM108 5H118V-5H108V5ZM31.5 5V-5H21.5V5H31.5ZM31.5 31.5V41.5H41.5V31.5H31.5ZM7.07107 33.5L8.53553 32.0355L-5.6066 17.8934L-7.07107 19.3579L7.07107 33.5ZM10 28.5V26.4289H-10V28.5H10ZM10 125V28.5H-10V125H10ZM10 130V125H-10V130H10ZM5 120H0V140H5V120ZM108 120H5V140H108V120ZM113 120H108V140H113V120ZM103 125V130H123V125H103ZM103 5V125H123V5H103ZM103 0V5H123V0H103ZM108 10H113V-10H108V10ZM28.5 10H108V-10H28.5V10ZM26.4289 10H28.5V-10H26.4289V10ZM32.0355 8.53553L33.5 7.07107L19.3579 -7.07107L17.8934 -5.6066L32.0355 8.53553ZM8.53553 32.0355L32.0355 8.53553L17.8934 -5.6066L-5.6066 17.8934L8.53553 32.0355ZM19.4289 -0.0710678L-0.0710678 19.4289L14.0711 33.5711L33.5711 14.0711L19.4289 -0.0710678ZM36.5 26.5V7H16.5V26.5H36.5ZM7 36.5H26.5V16.5H7V36.5ZM-5 31.5V120H15V31.5H-5ZM-5 120V125H15V120H-5ZM5 135H10V115H5V135ZM10 135H103V115H10V135ZM103 135H108V115H103V135ZM118 125V120H98V125H118ZM118 120V10H98V120H118ZM118 10V5H98V10H118ZM108 -5H103V15H108V-5ZM103 -5H31.5V15H103V-5ZM21.5 5V29H41.5V5H21.5ZM21.5 29V31.5H41.5V29H21.5ZM31.5 21.5H29V41.5H31.5V21.5ZM29 21.5H5V41.5H29V21.5Z"
          fill="black"
          mask="url(#path-1-inside-1_110_2)"
        />
      </svg>
    </div>
  )
}

export function ArrowDownSvg({ customStyle }: SvgProps) {
  return (
    <div className="floatingToolbarIcon" style={customStyle}>
      <svg
        width="15px"
        height="15px"
        viewBox="0 0 38 51"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M16.9822 49.7716C17.9585 50.7479 19.5415 50.7479 20.5178 49.7716L36.4277 33.8617C37.404 32.8854 37.404 31.3025 36.4277 30.3262C35.4514 29.3499 33.8684 29.3499 32.8921 30.3262L18.75 44.4683L4.60786 30.3262C3.63155 29.3499 2.04864 29.3499 1.07233 30.3262C0.0960197 31.3025 0.0960197 32.8854 1.07233 33.8617L16.9822 49.7716ZM16.25 -0.001297L16.25 48.0039H21.25L21.25 -0.001297L16.25 -0.001297Z"
          fill="black"
        />
      </svg>
    </div>
  )
}

export function ArrowUpSvg({ customStyle }: SvgProps) {
  return (
    <div className="floatingToolbarIcon" style={customStyle}>
      <svg
        width="15px"
        height="15px"
        viewBox="0 0 38 51"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M21.0178 1.23095C20.0415 0.254637 18.4585 0.254637 17.4822 1.23095L1.57233 17.1409C0.59602 18.1172 0.59602 19.7001 1.57233 20.6764C2.54864 21.6527 4.13155 21.6527 5.10786 20.6764L19.25 6.53425L33.3921 20.6764C34.3684 21.6527 35.9514 21.6527 36.9277 20.6764C37.904 19.7001 37.904 18.1172 36.9277 17.1409L21.0178 1.23095ZM21.75 51.0039L21.75 2.99871H16.75L16.75 51.0039H21.75Z"
          fill="black"
        />
      </svg>
    </div>
  )
}

export function ArrowLeftSvg({ customStyle }: SvgProps) {
  return (
    <div className="floatingToolbarIcon" style={customStyle}>
      <svg
        width="15px"
        height="15px"
        viewBox="0 0 51 38"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M1.23226 17.2322C0.255949 18.2085 0.255949 19.7914 1.23226 20.7678L17.1422 36.6777C18.1185 37.654 19.7014 37.654 20.6777 36.6777C21.654 35.7013 21.654 34.1184 20.6777 33.1421L6.53556 19L20.6777 4.85785C21.654 3.88154 21.654 2.29863 20.6777 1.32232C19.7014 0.346004 18.1185 0.346004 17.1422 1.32232L1.23226 17.2322ZM51.0052 16.5H3.00003V21.5H51.0052V16.5Z"
          fill="black"
        />
      </svg>
    </div>
  )
}

export function ArrowRightSvg({ customStyle }: SvgProps) {
  return (
    <div className="floatingToolbarIcon" style={customStyle}>
      <svg
        width="15px"
        height="15px"
        viewBox="0 0 51 38"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M49.7704 20.7703C50.7467 19.794 50.7467 18.2111 49.7704 17.2348L33.8605 1.32491C32.8842 0.348598 31.3012 0.348598 30.3249 1.32491C29.3486 2.30122 29.3486 3.88413 30.3249 4.86044L44.4671 19.0026L30.3249 33.1447C29.3486 34.121 29.3486 35.7039 30.3249 36.6802C31.3012 37.6566 32.8842 37.6566 33.8605 36.6802L49.7704 20.7703ZM-0.00256348 21.5026H48.0026V16.5026H-0.00256348L-0.00256348 21.5026Z"
          fill="black"
        />
      </svg>
    </div>
  )
}

export function PinSvg({ customStyle }: SvgProps) {
  return (
    <div className="floatingToolbarIcon" style={customStyle}>
      <svg
        width="15px"
        height="15px"
        viewBox="0 0 100 157"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M100 0H0L12.25 8.25L24.5 16.5V90L0 100H46V157H55V100H100L76.5 90V16.5L100 0Z"
          fill="black"
        />
      </svg>
    </div>
  )
}

export function UnpinSvg({ customStyle }: SvgProps) {
  return (
    <div className="floatingToolbarIcon" style={customStyle}>
      <svg
        width="15px"
        height="15px"
        viewBox="0 0 150 151"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M149.863 71.3474L79.1526 0.636719L81.981 15.1324L84.8094 29.6281L32.8371 81.6004L8.44191 71.3474L40.9688 103.874L0.663737 144.179L7.0277 150.543L47.3328 110.238L79.1526 142.058L69.6066 118.37L121.579 66.3976L149.863 71.3474Z"
          fill="black"
        />
      </svg>
    </div>
  )
}

export function GitDiffSvg({ customStyle }: SvgProps) {
  return (
    <div className="floatingToolbarIcon" style={customStyle}>
      <svg
        width="15px"
        height="15px"
        viewBox="0 0 297 304"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M109 86.5C109 116.17 85.5972 140 57 140C28.4028 140 5 116.17 5 86.5C5 56.8295 28.4028 33 57 33C85.5972 33 109 56.8295 109 86.5Z"
          fill="black"
          stroke="black"
          strokeWidth="10"
        />
        <path
          d="M183.04 246.245C185.937 242.91 185.581 237.857 182.245 234.96L127.883 187.75C124.547 184.853 119.494 185.209 116.597 188.545C113.7 191.881 114.056 196.934 117.392 199.831L165.714 241.795L123.75 290.117C120.853 293.453 121.209 298.506 124.545 301.403C127.881 304.3 132.934 303.944 135.831 300.608L183.04 246.245ZM48.39 139.076C48.39 144.376 48.0709 150.043 47.7585 156.216C47.451 162.293 47.1559 168.777 47.2678 175.287C47.4904 188.24 49.3183 202.155 56.5417 214.49C71.4627 239.968 106.133 254.01 177.562 248.98L176.438 233.02C105.867 237.99 80.2323 223.282 70.3483 206.404C65.1692 197.561 63.4697 186.896 63.2654 175.012C63.1639 169.102 63.4305 163.103 63.7381 157.024C64.0408 151.042 64.39 144.881 64.39 139.076L48.39 139.076Z"
          fill="black"
        />
        <path
          d="M187.679 217.326C187.679 187.656 211.081 163.826 239.679 163.826C268.276 163.826 291.679 187.656 291.679 217.326C291.679 246.997 268.276 270.826 239.679 270.826C211.081 270.826 187.679 246.997 187.679 217.326Z"
          fill="black"
          stroke="black"
          strokeWidth="10"
        />
        <path
          d="M113.638 57.5809C110.741 60.9169 111.097 65.9697 114.433 68.8667L168.796 116.076C172.131 118.973 177.184 118.617 180.081 115.281C182.978 111.945 182.622 106.893 179.287 103.996L130.964 62.0316L172.928 13.7095C175.825 10.3736 175.47 5.32077 172.134 2.42377C168.798 -0.473241 163.745 -0.11741 160.848 3.21854L113.638 57.5809ZM248.289 164.751C248.289 159.45 248.608 153.783 248.92 147.611C249.228 141.534 249.523 135.049 249.411 128.54C249.188 115.586 247.36 101.671 240.137 89.3366C225.216 63.8581 190.546 49.816 119.117 54.8462L120.241 70.8066C190.812 65.8369 216.446 80.5447 226.33 97.4222C231.509 106.266 233.209 116.93 233.413 128.815C233.515 134.725 233.248 140.723 232.941 146.802C232.638 152.785 232.289 158.945 232.289 164.751L248.289 164.751Z"
          fill="black"
        />
      </svg>
    </div>
  )
}
