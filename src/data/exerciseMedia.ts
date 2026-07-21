import type { ExerciseMediaKey } from './exerciseGuides';

export interface ExerciseMedia {
  image: number;
  gif: number;
}

export const exerciseMediaByKey: Record<ExerciseMediaKey, ExerciseMedia> = {
  '0292-C0MA9bC': {
    image: require('../../assets/exercises-dataset/0292-C0MA9bC-thumb.jpg'),
    gif: require('../../assets/exercises-dataset/0292-C0MA9bC-demo.gif'),
  },
  '0313-slDvUAU': {
    image: require('../../assets/exercises-dataset/0313-slDvUAU-thumb.jpg'),
    gif: require('../../assets/exercises-dataset/0313-slDvUAU-demo.gif'),
  },
  '0334-DsgkuIt': {
    image: require('../../assets/exercises-dataset/0334-DsgkuIt-thumb.jpg'),
    gif: require('../../assets/exercises-dataset/0334-DsgkuIt-demo.gif'),
  },
  '0377-EKXOMEh': {
    image: require('../../assets/exercises-dataset/0377-EKXOMEh-thumb.jpg'),
    gif: require('../../assets/exercises-dataset/0377-EKXOMEh-demo.gif'),
  },
  '0381-SSsBDwB': {
    image: require('../../assets/exercises-dataset/0381-SSsBDwB-thumb.jpg'),
    gif: require('../../assets/exercises-dataset/0381-SSsBDwB-demo.gif'),
  },
  '0405-znQUdHY': {
    image: require('../../assets/exercises-dataset/0405-znQUdHY-thumb.jpg'),
    gif: require('../../assets/exercises-dataset/0405-znQUdHY-demo.gif'),
  },
  '0410-qx4fgX7': {
    image: require('../../assets/exercises-dataset/0410-qx4fgX7-thumb.jpg'),
    gif: require('../../assets/exercises-dataset/0410-qx4fgX7-demo.gif'),
  },
  '0662-I4hDWkc': {
    image: require('../../assets/exercises-dataset/0662-I4hDWkc-thumb.jpg'),
    gif: require('../../assets/exercises-dataset/0662-I4hDWkc-demo.gif'),
  },
  '0705-RKjH6Lt': {
    image: require('../../assets/exercises-dataset/0705-RKjH6Lt-thumb.jpg'),
    gif: require('../../assets/exercises-dataset/0705-RKjH6Lt-demo.gif'),
  },
  '1373-bJYHBIN': {
    image: require('../../assets/exercises-dataset/1373-bJYHBIN-thumb.jpg'),
    gif: require('../../assets/exercises-dataset/1373-bJYHBIN-demo.gif'),
  },
  '1459-rR0LJzx': {
    image: require('../../assets/exercises-dataset/1459-rR0LJzx-thumb.jpg'),
    gif: require('../../assets/exercises-dataset/1459-rR0LJzx-demo.gif'),
  },
  '1760-yn8yg1r': {
    image: require('../../assets/exercises-dataset/1760-yn8yg1r-thumb.jpg'),
    gif: require('../../assets/exercises-dataset/1760-yn8yg1r-demo.gif'),
  },
  '3013-u0cNiij': {
    image: require('../../assets/exercises-dataset/3013-u0cNiij-thumb.jpg'),
    gif: require('../../assets/exercises-dataset/3013-u0cNiij-demo.gif'),
  },
};
