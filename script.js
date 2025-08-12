document.addEventListener('DOMContentLoaded', function() {
    const billImageInput = document.getElementById('billImage');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const imagePreview = document.getElementById('imagePreview');
    const attendeesInput = document.getElementById('attendees');
    const resultsSection = document.getElementById('resultsSection');
    const itemsTableBody = document.getElementById('itemsTableBody');
    const billSummary = document.getElementById('billSummary');
    const totalsRow = document.getElementById('totalsRow');
    const individualTotals = document.getElementById('individualTotals');
    
    let billData = null;
    let attendees = [];
    
    // Preview uploaded image
    billImageInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = function(event) {
                imagePreview.innerHTML = `<img src="${event.target.result}" alt="Bill Preview">`;
            };
            
            reader.readAsDataURL(file);
        }
    });
    
    // Analyze bill button click
    analyzeBtn.addEventListener('click', async function() {
        if (!billImageInput.files || billImageInput.files.length === 0) {
            alert('Please upload a bill image first');
            return;
        }
        
        const attendeesText = attendeesInput.value.trim();
        if (!attendeesText) {
            alert('Please enter attendee names');
            return;
        }
        
        attendees = attendeesText.split(',').map(name => name.trim()).filter(name => name);
        if (attendees.length === 0) {
            alert('Please enter at least one attendee');
            return;
        }
        
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = 'Analyzing <span class="loading"></span>';
        
        try {
            const imageUrl = await uploadImageToServer(billImageInput.files[0]);
            billData = await analyzeBill(imageUrl);
            
            if (billData && billData.items) {
                displayBillData(billData);
                resultsSection.style.display = 'block';
            } else {
                throw new Error('Invalid bill data received');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error analyzing bill: ' + error.message);
        } finally {
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = 'Analyze Bill';
        }
    });
    
    // Upload image to a temporary server (using base64 for this demo)
    async function uploadImageToServer(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                resolve(event.target.result);
            };
            reader.readAsDataURL(file);
        });
    }
    
    // Send image to backend for analysis
    async function analyzeBill(imageUrl) {
        const response = await fetch('https://billspliter.onrender.com/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                imageUrl: imageUrl,
                prompt: "Convert the image of a bill into key-value pairs, including taxes as a key-value pair."
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Extract the JSON from the response (assuming it's in the format shown)
        const content = data.content || '';
        const jsonStart = content.indexOf('{');
        const jsonEnd = content.lastIndexOf('}') + 1;
        
        if (jsonStart === -1 || jsonEnd === -1) {
            throw new Error('Could not find JSON data in response');
        }
        
        const jsonString = content.substring(jsonStart, jsonEnd);
        return JSON.parse(jsonString);
    }
    
    // Display bill data and create split interface
    function displayBillData(data) {
        // Display bill summary
        billSummary.innerHTML = `
            <p><strong>Sub Total:</strong> ₹${data.bill_summary.sub_total.toFixed(2)}</p>
            <p><strong>Service Charge:</strong> ₹${data.bill_summary.service_charge.toFixed(2)}</p>
            <p><strong>CGST:</strong> ₹${data.bill_summary.cgst.toFixed(2)}</p>
            <p><strong>SGST:</strong> ₹${data.bill_summary.sgst.toFixed(2)}</p>
            <p><strong>Total Payable:</strong> ₹${data.bill_summary.total_payable.toFixed(2)}</p>
        `;
        
        // Clear previous items
        itemsTableBody.innerHTML = '';
        
        // Create header columns for attendees
        const headerRow = document.querySelector('#splitTable thead tr');
        // Clear existing attendee columns (keep first 3 columns)
        while (headerRow.children.length > 3) {
            headerRow.removeChild(headerRow.lastChild);
        }
        
        // Add attendee columns
        attendees.forEach(attendee => {
            const th = document.createElement('th');
            th.textContent = attendee;
            headerRow.appendChild(th);
        });
        
        // Add tax and total columns
        const taxTh = document.createElement('th');
        taxTh.textContent = 'Tax';
        headerRow.appendChild(taxTh);
        
        const totalTh = document.createElement('th');
        totalTh.textContent = 'Total';
        headerRow.appendChild(totalTh);
        
        // Add bill items
        data.items.forEach(item => {
            const row = document.createElement('tr');
            
            // Item info cells
            const itemNameCell = document.createElement('td');
            itemNameCell.textContent = item.item;
            row.appendChild(itemNameCell);
            
            const qtyCell = document.createElement('td');
            qtyCell.textContent = item.qty;
            row.appendChild(qtyCell);
            
            const amountCell = document.createElement('td');
            amountCell.textContent = '₹' + item.amount.toFixed(2);
            row.appendChild(amountCell);
            
            // Attendee checkboxes
            attendees.forEach(() => {
                const checkboxCell = document.createElement('td');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.dataset.amount = item.amount;
                checkbox.addEventListener('change', calculateTotals);
                checkboxCell.appendChild(checkbox);
                row.appendChild(checkboxCell);
            });
            
            // Empty cells for tax and total (will be filled in calculateTotals)
            row.appendChild(document.createElement('td')); // Tax
            row.appendChild(document.createElement('td')); // Total
            
            itemsTableBody.appendChild(row);
        });
        
        // Create totals row
        updateTotalsRow();
        calculateTotals();
    }
    
    // Calculate totals when checkboxes change
    function calculateTotals() {
        const rows = itemsTableBody.querySelectorAll('tr');
        const taxRate = calculateTotalTaxRate();
        
        // Reset individual totals
        const individualAmounts = attendees.map(() => 0);
        const individualTaxes = attendees.map(() => 0);
        
        // Calculate amounts for each attendee
        rows.forEach(row => {
            const amount = parseFloat(row.querySelector('td:nth-child(3)').textContent.replace('₹', ''));
            const checkboxes = row.querySelectorAll('input[type="checkbox"]');
            
            checkboxes.forEach((checkbox, index) => {
                if (checkbox.checked) {
                    individualAmounts[index] += amount;
                    individualTaxes[index] += amount * taxRate;
                }
            });
        });
        
        // Update tax and total columns for each row
        rows.forEach(row => {
            const checkboxes = row.querySelectorAll('input[type="checkbox"]');
            const amount = parseFloat(row.querySelector('td:nth-child(3)').textContent.replace('₹', ''));
            
            // Calculate how many people selected this item
            const selectedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
            
            // Tax cell (second last cell)
            const taxCell = row.cells[row.cells.length - 2];
            // Total cell (last cell)
            const totalCell = row.cells[row.cells.length - 1];
            
            if (selectedCount > 0) {
                const itemTax = (amount * taxRate) / selectedCount;
                const itemTotal = (amount + (amount * taxRate)) / selectedCount;
                
                taxCell.textContent = '₹' + itemTax.toFixed(2);
                totalCell.textContent = '₹' + itemTotal.toFixed(2);
            } else {
                taxCell.textContent = '₹0.00';
                totalCell.textContent = '₹0.00';
            }
        });
        
        // Update individual totals display
        individualTotals.innerHTML = '';
        attendees.forEach((attendee, index) => {
            const total = individualAmounts[index] + individualTaxes[index];
            
            const div = document.createElement('div');
            div.className = 'individual-total';
            div.innerHTML = `
                <span>${attendee}</span>
                <span class="total-amount">₹${total.toFixed(2)}</span>
            `;
            individualTotals.appendChild(div);
        });
        
        updateTotalsRow();
    }
    
    // Calculate total tax rate (sum of all tax percentages)
    function calculateTotalTaxRate() {
        if (!billData || !billData.bill_summary) return 0;
        
        const subtotal = billData.bill_summary.sub_total;
        if (subtotal === 0) return 0;
        
        const totalTax = (billData.bill_summary.cgst || 0) + 
                         (billData.bill_summary.sgst || 0) + 
                         (billData.bill_summary.service_charge || 0);
        
        return totalTax / subtotal;
    }
    
    // Update the totals row at the bottom of the table
    function updateTotalsRow() {
        totalsRow.innerHTML = '';
        
        // Create cells for the first 3 columns
        const labelCell = document.createElement('td');
        labelCell.colSpan = 3;
        labelCell.textContent = 'Totals:';
        labelCell.style.textAlign = 'right';
        labelCell.style.fontWeight = 'bold';
        totalsRow.appendChild(labelCell);
        
        // Calculate totals for each attendee
        const rows = itemsTableBody.querySelectorAll('tr');
        const attendeeTotals = attendees.map(() => 0);
        
        rows.forEach(row => {
            const checkboxes = row.querySelectorAll('input[type="checkbox"]');
            const totalCell = row.cells[row.cells.length - 1];
            const itemTotal = parseFloat(totalCell.textContent.replace('₹', '')) || 0;
            
            checkboxes.forEach((checkbox, index) => {
                if (checkbox.checked) {
                    attendeeTotals[index] += itemTotal;
                }
            });
        });
        
        // Add cells for each attendee's total
        attendeeTotals.forEach(total => {
            const cell = document.createElement('td');
            cell.textContent = '₹' + total.toFixed(2);
            cell.style.fontWeight = 'bold';
            totalsRow.appendChild(cell);
        });
        
        // Add empty cells for tax and total columns to maintain structure
        totalsRow.appendChild(document.createElement('td'));
        
        const grandTotalCell = document.createElement('td');
        const grandTotal = attendeeTotals.reduce((sum, val) => sum + val, 0);
        grandTotalCell.textContent = '₹' + grandTotal.toFixed(2);
        grandTotalCell.style.fontWeight = 'bold';
        totalsRow.appendChild(grandTotalCell);
    }
});
