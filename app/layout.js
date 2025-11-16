import './globals.css';
import 'leaflet/dist/leaflet.css';

export const metadata = {
  title: 'Temple Finder',
  description: 'Find temples near any location',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
