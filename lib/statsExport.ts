import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { Profile } from '@/lib/database.types';

export async function exportStatsPdf(profile: Profile, accuracyPercent: number) {
  const html = `
    <html>
      <body style="font-family: -apple-system, sans-serif; padding: 40px; color: #111;">
        <h1 style="color: #DC2626;">TeamUp11 – Deine Statistik</h1>
        <p style="color: #666;">Stand: ${new Date().toLocaleDateString('de-AT')}</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 24px;">
          <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee;">Benutzername</td><td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${profile.username}</td></tr>
          <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee;">Level</td><td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${profile.level}</td></tr>
          <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee;">Gesamtpunkte</td><td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${profile.points}</td></tr>
          <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee;">Tipps abgegeben</td><td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${profile.tips_count}</td></tr>
          <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee;">Richtige Tipps</td><td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${profile.correct_tips_count}</td></tr>
          <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee;">Trefferquote</td><td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${accuracyPercent}%</td></tr>
          <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee;">Login-Streak</td><td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${profile.login_streak} Tage</td></tr>
        </table>
      </body>
    </html>
  `;

  if (Platform.OS === 'web') {
    // expo-print's web shim just calls window.print() on the current page,
    // ignoring the html we pass in - so build the export in a new tab
    // ourselves and print (→ "Save as PDF") from there instead.
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  }
}
