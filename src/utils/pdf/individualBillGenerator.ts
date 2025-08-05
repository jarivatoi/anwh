import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RosterEntry } from '../../types/roster';

interface IndividualBillOptions {
  staffName: string;
  month: string;
  year: string;
  entries: RosterEntry[];
  hourlyRate: number;
}

class IndividualBillGenerator {
  generateBill(options: IndividualBillOptions): jsPDF {
    const { staffName, month, year, entries, hourlyRate } = options;
    
    console.log('📄 Starting individual bill generation for:', staffName);
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Filter entries for the specific staff member
    const staffEntries = entries.filter(entry => 
      entry.staffName === staffName &&
      entry.date.getMonth() === parseInt(month) - 1 &&
      entry.date.getFullYear() === parseInt(year)
    );

    // Group entries by date to combine multiple shifts
    const entriesByDate = new Map<string, RosterEntry[]>();
    staffEntries.forEach(entry => {
      const dateKey = entry.date.toDateString();
      if (!entriesByDate.has(dateKey)) {
        entriesByDate.set(dateKey, []);
      }
      entriesByDate.get(dateKey)!.push(entry);
    });

    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('INDIVIDUAL WORK SUMMARY', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Staff: ${staffName}`, 20, 35);
    doc.text(`Period: ${month}/${year}`, 20, 45);

    // Prepare table data
    const tableData: any[] = [];
    let totalHours = 0;
    let totalAmount = 0;
    let nightDutyCount = 0;

    // Sort dates chronologically
    const sortedDates = Array.from(entriesByDate.keys()).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    );

    sortedDates.forEach(dateKey => {
      const dayEntries = entriesByDate.get(dateKey)!;
      const date = dayEntries[0].date;
      
      // Combine shifts for the same date
      const shifts: string[] = [];
      let dayHours = 0;
      let dayAmount = 0;

      dayEntries.forEach(entry => {
        // Add shift symbol
        switch(entry.shiftType) {
          case 'Morning Duty': shifts.push('M'); break;
          case 'Saturday Duty': shifts.push('S'); break;
          case 'Evening Duty': shifts.push('E'); break;
          case 'Night Duty': 
            shifts.push('N'); 
            nightDutyCount++;
            break;
          case 'Special Duty': shifts.push('Sp'); break;
          default: shifts.push('?'); break;
        }
        
        dayHours += entry.hours;
        dayAmount += entry.hours * hourlyRate;
      });

      totalHours += dayHours;
      totalAmount += dayAmount;

      // Format date and day
      const formattedDate = date.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const shiftsText = shifts.join('+');

      tableData.push([
        formattedDate,
        dayName,
        shiftsText,
        dayHours.toFixed(1),
        `Rs ${dayAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]);
    });

    // Generate table
    autoTable(doc, {
      head: [['Date', 'Day', 'Shifts', 'Hours', 'Amount']],
      body: tableData,
      startY: 55,
      styles: {
        fontSize: 8,
        cellPadding: 1.5,
        lineColor: [0, 0, 0],
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 25, halign: 'center' }, // Date
        1: { cellWidth: 20, halign: 'center' }, // Day
        2: { cellWidth: 25, halign: 'center' }, // Shifts
        3: { cellWidth: 20, halign: 'right' },  // Hours
        4: { cellWidth: 35, halign: 'right' }   // Amount
      },
      margin: { left: 20, right: 20 },
      pageBreak: 'avoid',
      rowPageBreak: 'avoid'
    });

    // Calculate night duty allowance
    const nightAllowance = nightDutyCount * 500;
    const grandTotal = totalAmount + nightAllowance;

    // Summary section
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('SUMMARY:', 20, finalY);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Working Days: ${tableData.length}`, 20, finalY + 10);
    doc.text(`Total Working Hours: ${totalHours.toFixed(1)}`, 20, finalY + 20);
    doc.text(`Hourly Rate: Rs ${hourlyRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 20, finalY + 30);
    
    doc.text(`Subtotal (Hours): Rs ${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 20, finalY + 45);
    
    if (nightDutyCount > 0) {
      doc.text(`Night Duty Allowance: ${nightDutyCount} nights × Rs 500 = Rs ${nightAllowance.toLocaleString('en-IN')}`, 20, finalY + 55);
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`TOTAL AMOUNT: Rs ${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 20, finalY + (nightDutyCount > 0 ? 70 : 60));

    // Generate filename
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const filename = `${staffName}_${monthNames[month]}_${year}_Bill.pdf`;
    
    // Save the PDF
    doc.save(filename);
    
    console.log('✅ Individual bill generated:', filename);
  }
}

export const individualBillGenerator = new IndividualBillGenerator();