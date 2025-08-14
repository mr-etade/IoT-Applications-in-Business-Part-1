let pyodide;
let smartCityData = null;
let pyodideLoading = false;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeTabs();
    initializeDragAndDrop();
    initializeMarketChart();
    initializeMarketQuiz();
    initializePillarsQuiz();
});

// Tab functionality
function initializeTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const targetTab = btn.dataset.tab;
            
            // Remove active class from all tabs and contents
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            btn.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
            
            // Load Pyodide only when IoT Simulation tab is clicked
            if (targetTab === 'iot-simulation' && !pyodide && !pyodideLoading) {
                await initializePyodide();
            }
        });
    });
}

// Initialize Pyodide with improved error handling
async function initializePyodide() {
    if (pyodideLoading || pyodide) return;
    pyodideLoading = true;
    
    const output = document.getElementById('pythonOutput');
    const loadingIndicator = document.getElementById('pyodideLoading');
    
    if (output) output.innerHTML = '';
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    
    try {
        // Check if Pyodide is already loaded globally
        if (typeof loadPyodide === 'undefined') {
            // If not, try to load it dynamically
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
                script.onload = resolve;
                script.onerror = () => {
                    reject(new Error('Failed to load Pyodide script'));
                };
                document.head.appendChild(script);
            });
        }
        
        pyodide = await loadPyodide({
            stdout: (text) => {
                if (output) {
                    output.innerHTML += text + '<br>';
                    output.scrollTop = output.scrollHeight;
                }
            },
            stderr: (text) => {
                if (output) {
                    output.innerHTML += `<span style="color:#f46659">${text}</span><br>`;
                }
            }
        });
        
        // Load only the necessary packages
        await pyodide.loadPackage(['numpy']);
        
        // Set up simulation buttons
        document.getElementById('startSimulation').addEventListener('click', startSimulation);
        document.getElementById('generateData').addEventListener('click', generateIoTData);
        document.getElementById('analyzeData').addEventListener('click', analyzeIoTData);
        document.getElementById('runCode').addEventListener('click', runPythonCode);
        
        console.log('Pyodide loaded successfully');
        if (output) output.innerHTML += 'Python environment ready!<br>';
    } catch (error) {
        console.error('Failed to load Pyodide:', error);
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        if (output) {
            output.innerHTML = `
                Error loading Python environment: ${error.message}<br>
                <button class="simulation-btn" id="retryPyodide">Retry Loading Python</button>
            `;
            document.getElementById('retryPyodide').addEventListener('click', initializePyodide);
        }
    } finally {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        pyodideLoading = false;
    }
}

// Drag and Drop for Six Pillars Lab
function initializeDragAndDrop() {
    const pillarItems = document.querySelectorAll('.pillar-item');
    const dropZones = document.querySelectorAll('.drop-zone');
    
    pillarItems.forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
    });
    
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', handleDragOver);
        zone.addEventListener('drop', handleDrop);
        zone.addEventListener('dragenter', handleDragEnter);
        zone.addEventListener('dragleave', handleDragLeave);
    });
    
    document.getElementById('checkPillars').addEventListener('click', checkPillarsAnswers);
}

// Drag and drop handlers
let draggedElement = null;

function handleDragStart(e) {
    draggedElement = e.target;
    e.target.style.opacity = '0.5';
}

function handleDragEnd(e) {
    e.target.style.opacity = '';
    draggedElement = null;
}

function handleDragOver(e) {
    e.preventDefault();
}

function handleDragEnter(e) {
    e.preventDefault();
    if (e.target.classList.contains('drop-zone')) {
        e.target.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    if (e.target.classList.contains('drop-zone')) {
        e.target.classList.remove('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();
    const dropZone = e.target;
    
    if (dropZone.classList.contains('drop-zone') && draggedElement) {
        dropZone.innerHTML = '';
        
        const clonedElement = draggedElement.cloneNode(true);
        clonedElement.style.opacity = '';
        clonedElement.draggable = false;
        
        dropZone.appendChild(clonedElement);
        dropZone.classList.remove('drag-over');
    }
}

// Check Six Pillars answers
function checkPillarsAnswers() {
    const descriptionBoxes = document.querySelectorAll('.description-box');
    let correctCount = 0;
    let totalCount = descriptionBoxes.length;
    
    descriptionBoxes.forEach(box => {
        const dropZone = box.querySelector('.drop-zone');
        const correctAnswer = box.dataset.answer;
        const droppedItem = dropZone.querySelector('.pillar-item');
        
        dropZone.classList.remove('correct', 'incorrect');
        
        if (droppedItem) {
            const droppedAnswer = droppedItem.dataset.pillar;
            if (droppedAnswer === correctAnswer) {
                dropZone.classList.add('correct');
                correctCount++;
            } else {
                dropZone.classList.add('incorrect');
            }
        } else {
            dropZone.classList.add('incorrect');
        }
    });
    
    const resultBox = document.getElementById('pillarsResult');
    const percentage = Math.round((correctCount / totalCount) * 100);
    
    if (percentage === 100) {
        resultBox.className = 'result-box success';
        resultBox.innerHTML = `
            🎉 Perfect! You got all ${totalCount} pillars correct!<br>
            You clearly understand the Cisco IoT System architecture.
        `;
    } else if (percentage >= 70) {
        resultBox.className = 'result-box success';
        resultBox.innerHTML = `
            ✅ Good work! You got ${correctCount}/${totalCount} correct (${percentage}%)<br>
            Review the incorrect answers and try again.
        `;
    } else {
        resultBox.className = 'result-box error';
        resultBox.innerHTML = `
            ❌ You got ${correctCount}/${totalCount} correct (${percentage}%)<br>
            Please review the Six Pillars concept and try again.
        `;
    }
}

// Reusable function to handle quiz button clicks
function handleQuizButtonClick(e, quizQuestions) {
    const questionIndex = parseInt(e.target.dataset.question, 10);
    const userAnswer = e.target.dataset.answer;
    const resultDiv = document.getElementById(`result-${questionIndex}`);
    
    if (!quizQuestions[questionIndex]) {
        console.error(`Invalid question index: ${questionIndex}`);
        resultDiv.innerHTML = `<span style="color: #f46659;">❌ Error:</span> Invalid question. Please try again.`;
        return;
    }
    
    const correctAnswer = quizQuestions[questionIndex].answer;
    const explanation = quizQuestions[questionIndex].explanation;
    
    const quizContainer = e.target.closest('#six-pillars');
    
    const questionBtns = quizContainer.querySelectorAll(`[data-question="${questionIndex}"]`);
    questionBtns.forEach(button => button.disabled = true);
    
    if (userAnswer === correctAnswer) {
        resultDiv.innerHTML = `<span style="color: #1cc549;">✅ Correct!</span> ${explanation}`;
        e.target.style.backgroundColor = '#1cc549';
    } else {
        resultDiv.innerHTML = `<span style="color: #f46659;">❌ Incorrect.</span> ${explanation}`;
        e.target.style.backgroundColor = '#f46659';
        const correctButton = quizContainer.querySelector(`[data-question="${questionIndex}"][data-answer="${correctAnswer}"]`);
        if (correctButton) {
            correctButton.style.backgroundColor = '#1cc549';
        }
    }
}

// Six Pillars Quiz
function initializePillarsQuiz() {
    const quizQuestions = [
        {
            question: "Which of the following is a component of Network Connectivity?",
            answer: "routers",
            explanation: "Industrial routers are part of Network Connectivity, providing reliable and scalable routing solutions."
        },
        {
            question: "Which of the following is a component of Fog Computing?",
            answer: "local_processing",
            explanation: "Local processing units are used in Fog Computing to process data closer to the edge."
        },
        {
            question: "Which of the following is a component of Security?",
            answer: "encryption",
            explanation: "Encryption devices are critical components of Security, ensuring data protection."
        },
        {
            question: "Which of the following is a component of Data Analytics?",
            answer: "ml_tools",
            explanation: "Machine learning tools are used in Data Analytics for processing and analyzing IoT data."
        },
        {
            question: "Which of the following is a component of Management & Automation?",
            answer: "automation",
            explanation: "Automation controllers are part of Management & Automation, enabling control and convergence of IT/OT networks."
        },
        {
            question: "Which of the following is a component of Application Enablement Platform?",
            answer: "apis",
            explanation: "APIs are key components of the Application Enablement Platform, supporting application development."
        }
    ];
    
    document.querySelectorAll('#six-pillars .quiz-btn[data-answer][data-question]').forEach(btn => {
        btn.addEventListener('click', (e) => handleQuizButtonClick(e, quizQuestions));
    });
}

// Market Analysis Chart
function initializeMarketChart() {
    Highcharts.chart('marketChart', {
        chart: {
            type: 'column',
            backgroundColor: 'transparent'
        },
        title: {
            text: 'IoT Market Applications Distribution',
            style: { color: '#eb8fd8' }
        },
        xAxis: {
            categories: ['Security', 'Healthcare', 'Manufacturing', 'Smart Cities', 'Automotive', 'Finance'],
            labels: { style: { color: '#ffffff' } }
        },
        yAxis: {
            title: {
                text: 'Market Size (Billions USD)',
                style: { color: '#ba94e9' }
            },
            labels: { style: { color: '#ffffff' } }
        },
        legend: {
            itemStyle: { color: '#ffffff' }
        },
        plotOptions: {
            column: {
                borderRadius: 5,
                dataLabels: {
                    enabled: true,
                    style: { color: '#ffffff' }
                }
            }
        },
        series: [{
            name: 'Horizontal Markets',
            data: [45, 12, 8, 15, 5, 35],
            color: '#b9d4b4'
        }, {
            name: 'Vertical Markets',
            data: [10, 38, 42, 25, 48, 28],
            color: '#f46659'
        }]
    });
}

// Market Analysis Quiz
function initializeMarketQuiz() {
    const quizQuestions = [
        {
            question: "A company provides AI-powered chatbots for customer service across retail, banking, and healthcare industries.",
            answer: "horizontal",
            explanation: "This serves multiple industries with a common need (customer service)"
        },
        {
            question: "A specialized IoT system for monitoring blood pressure and heart rate in cardiac care units.",
            answer: "vertical",
            explanation: "This is specifically designed for healthcare/medical industry"
        },
        {
            question: "Cloud computing services used by educational institutions, government agencies, and private companies.",
            answer: "horizontal",
            explanation: "Cloud services meet common IT needs across various industries"
        },
        {
            question: "Software designed exclusively for managing aircraft maintenance schedules and flight operations.",
            answer: "vertical",
            explanation: "This is specifically for the aviation industry"
        }
    ];
    
    const quizContainer = document.getElementById('marketQuiz');
    quizContainer.innerHTML = '';
    
    quizQuestions.forEach((q, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'quiz-question';
        questionDiv.innerHTML = `
            <div class="question-text">
                <strong>Question ${index + 1}:</strong> ${q.question}
            </div>
            <div class="quiz-options">
                <button class="quiz-btn" data-answer="horizontal" data-question="${index}">Horizontal Market</button>
                <button class="quiz-btn" data-answer="vertical" data-question="${index}">Vertical Market</button>
            </div>
            <div class="quiz-result" id="market-result-${index}"></div>
        `;
        quizContainer.appendChild(questionDiv);
    });
    
    document.querySelectorAll('#marketQuiz .quiz-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const questionIndex = parseInt(e.target.dataset.question, 10);
            const userAnswer = e.target.dataset.answer;
            const resultDiv = document.getElementById(`market-result-${questionIndex}`);
            
            if (!quizQuestions[questionIndex]) {
                console.error(`Invalid question index: ${questionIndex}`);
                resultDiv.innerHTML = `<span style="color: #f46659;">❌ Error:</span> Invalid question. Please try again.`;
                return;
            }
            
            const correctAnswer = quizQuestions[questionIndex].answer;
            const explanation = quizQuestions[questionIndex].explanation;
            
            const quizContainer = e.target.closest('#marketQuiz');
            const questionBtns = quizContainer.querySelectorAll(`[data-question="${questionIndex}"]`);
            questionBtns.forEach(button => button.disabled = true);
            
            if (userAnswer === correctAnswer) {
                resultDiv.innerHTML = `<span style="color: #1cc549;">✅ Correct!</span> ${explanation}`;
                e.target.style.backgroundColor = '#1cc549';
            } else {
                resultDiv.innerHTML = `<span style="color: #f46659;">❌ Incorrect.</span> ${explanation}`;
                e.target.style.backgroundColor = '#f46659';
                const correctButton = quizContainer.querySelector(`[data-question="${questionIndex}"][data-answer="${correctAnswer}"]`);
                if (correctButton) {
                    correctButton.style.backgroundColor = '#1cc549';
                }
            }
        });
    });
}

async function startSimulation() {
    const output = document.getElementById('pythonOutput');
    if (!output) return;
    
    output.innerHTML = 'Starting Smart City IoT Simulation...<br>';
    
    if (!pyodide) {
        output.innerHTML += 'Initializing Python environment...<br>';
        await initializePyodide();
    }
    
    if (!pyodide) {
        output.innerHTML += 'Error: Python environment could not be initialized.<br>';
        return;
    }
    
    try {
        const code = document.getElementById('pythonCode').value;
        await pyodide.runPython(code);
        output.innerHTML += 'Simulation initialized successfully!<br>';
    } catch (error) {
        output.innerHTML += `Error: ${error}<br>`;
    }
}

async function generateIoTData() {
    if (!pyodide) return;
    
    const output = document.getElementById('pythonOutput');
    output.innerHTML += '<br>Generating IoT sensor data...<br>';
    
    try {
        await pyodide.runPython(`
smart_city.generate_sensor_data(24)
print("Generated 24 hours of IoT sensor data:")
print(f"- Traffic sensors: {len(smart_city.sensors['traffic'])} readings")
print(f"- Parking sensors: {len(smart_city.sensors['parking'])} readings")
print(f"- Air quality sensors: {len(smart_city.sensors['air_quality'])} readings")
print(f"- Energy sensors: {len(smart_city.sensors['energy'])} readings")
        `);
    } catch (error) {
        output.innerHTML += `Error: ${error}<br>`;
    }
}

async function analyzeIoTData() {
    if (!pyodide) return;
    
    const output = document.getElementById('pythonOutput');
    output.innerHTML += '<br>Analyzing IoT data...<br>';
    
    try {
        const analysisResult = await pyodide.runPython(`
analysis = smart_city.analyze_traffic_patterns()
chart_data = smart_city.get_chart_data()

print("Traffic Analysis Results:")
if isinstance(analysis, dict):
    for key, value in analysis.items():
        print(f"- {key.replace('_', ' ').title()}: {value}")
else:
    print(analysis)

chart_data
        `);
        
        if (analysisResult && analysisResult.toJs) {
            const data = analysisResult.toJs({dict_converter: Object.fromEntries});
            createSimulationChart(data);
        }
    } catch (error) {
        output.innerHTML += `Error: ${error}<br>`;
    }
}

async function runPythonCode() {
    if (!pyodide) return;
    
    const code = document.getElementById('pythonCode').value;
    const output = document.getElementById('pythonOutput');
    output.innerHTML = 'Running Python code...<br>';
    
    try {
        await pyodide.runPython(code);
    } catch (error) {
        output.innerHTML += `Error: ${error}<br>`;
    }
}

function createSimulationChart(data) {
    if (!data.hours || !data.vehicles) return;
    
    const chartData = data.hours.map((hour, index) => ({
        x: hour,
        y: data.vehicles[index]
    }));
    
    const parkingData = data.hours.map((hour, index) => ({
        x: hour,
        y: data.parking[index]
    }));
    
    Highcharts.chart('simulationChart', {
        chart: {
            type: 'line',
            backgroundColor: 'transparent'
        },
        title: {
            text: 'Smart City IoT Data - 24 Hour Simulation',
            style: { color: '#eb8fd8' }
        },
        xAxis: {
            title: {
                text: 'Hour of Day',
                style: { color: '#ba94e9' }
            },
            labels: { style: { color: '#ffffff' } }
        },
        yAxis: {
            title: {
                text: 'Count',
                style: { color: '#ba94e9' }
            },
            labels: { style: { color: '#ffffff' } }
        },
        legend: {
            itemStyle: { color: '#ffffff' }
        },
        series: [{
            name: 'Vehicles per Hour',
            data: chartData,
            color: '#1cc549'
        }, {
            name: 'Available Parking Spots',
            data: parkingData,
            color: '#ffbc3e'
        }]
    });
}

const quizStyles = `
.quiz-question {
    background: rgba(255, 255, 255, 0.05);
    padding: 15px;
    margin: 10px 0;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.question-text {
    margin-bottom: 10px;
    color: #ffffff;
}

.quiz-options {
    display: flex;
    gap: 10px;
    margin: 10px 0;
}

.quiz-btn {
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    color: var(--dark);
    border: none;
    padding: 10px 20px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: bold;
    transition: all 0.3s ease;
}

.quiz-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(235, 143, 216, 0.3);
}

.quiz-btn:disabled {
    cursor: not-allowed;
    opacity: 0.8;
}

.quiz-result {
    margin-top: 10px;
    font-weight: bold;
}
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = quizStyles;
document.head.appendChild(styleSheet);