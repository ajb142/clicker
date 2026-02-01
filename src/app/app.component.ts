import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

interface Topic {
  id: string;
  name: string;
  color: string;
  count: number;
}

interface TimelineEvent {
  topicId: string;
  topicName: string;
  timestamp: number;
  isoDatestamp: string;
}

const DEFAULT_COLORS = [
  '#27AE60', // Green for Pass
  '#E74C3C', // Red for Fail
  '#3498DB', // Blue
  '#F39C12', // Orange
  '#9B59B6', // Purple
  '#1ABC9C', // Turquoise
  '#34495E', // Dark Gray
  '#E67E22', // Dark Orange
  '#16A085', // Teal
  '#8E44AD', // Violet
  '#2980B9', // Dark Blue
  '#C0392B', // Dark Red
];

const MAX_EVENTS = 2000;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'Event Counter';
  topics: Topic[] = [];
  timeline: TimelineEvent[] = [];
  newTopicName = '';
  capacityReachedAlert = false;
  colorIndex = 0;

  pieChartData: ChartConfiguration<'pie'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: [],
      }
    ]
  };

  pieChartOptions: ChartConfiguration<'pie'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom',
      }
    }
  };

  lineChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: []
  };

  lineChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    indexAxis: 'x',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return 'Event #' + (context.dataIndex + 1);
          }
        }
      }
    },
    scales: {
      y: {
        display: false,
        beginAtZero: true,
        max: 1
      },
      x: {
        display: true,
        title: {
          display: true,
          text: 'Event Sequence'
        }
      }
    }
  };

  constructor() {}

  ngOnInit(): void {
    this.loadFromStorage();
    if (this.topics.length === 0) {
      this.initializeDefaultTopics();
    } else {
      // Ensure Pass and Fail have correct colors
      const passTopics = this.topics.filter(t => t.name === 'Pass');
      const failTopics = this.topics.filter(t => t.name === 'Fail');
      
      if (passTopics.length > 0) {
        passTopics[0].color = DEFAULT_COLORS[0]; // Green
      }
      if (failTopics.length > 0) {
        failTopics[0].color = DEFAULT_COLORS[1]; // Red
      }
    }
    this.updateCharts();
  }

  private initializeDefaultTopics(): void {
    this.addTopicWithColor('Pass', DEFAULT_COLORS[0]); // Green
    this.addTopicWithColor('Fail', DEFAULT_COLORS[1]); // Red
  }

  private addTopicWithColor(name: string, color: string): void {
    const topic: Topic = {
      id: Date.now().toString() + Math.random(),
      name,
      color,
      count: 0
    };
    this.topics.push(topic);
  }

  private addTopicWithoutStorage(name: string): void {
    const topic: Topic = {
      id: Date.now().toString() + Math.random(),
      name,
      color: DEFAULT_COLORS[(this.colorIndex + 2) % DEFAULT_COLORS.length],
      count: 0
    };
    this.colorIndex++;
    this.topics.push(topic);
  }

  addTopic(): void {
    if (this.newTopicName.trim()) {
      this.addTopicWithoutStorage(this.newTopicName.trim());
      this.newTopicName = '';
      this.saveToStorage();
      this.updateCharts();
    }
  }

  incrementTopic(topicId: string): void {
    if (this.timeline.length >= MAX_EVENTS) {
      this.capacityReachedAlert = true;
      setTimeout(() => {
        this.capacityReachedAlert = false;
      }, 5000);
      return;
    }

    const topic = this.topics.find(t => t.id === topicId);
    if (topic) {
      topic.count++;
      const event: TimelineEvent = {
        topicId,
        topicName: topic.name,
        timestamp: Date.now(),
        isoDatestamp: new Date().toISOString()
      };
      this.timeline.push(event);
      this.saveToStorage();
      this.updateCharts();
    }
  }

  clearData(): void {
    if (confirm('Are you sure you want to clear all counts? Timeline events will be preserved.')) {
      this.topics.forEach(topic => {
        topic.count = 0;
      });
      this.saveToStorage();
      this.updateCharts();
    }
  }

  resetTopics(): void {
    if (confirm('Are you sure you want to reset all topics to Pass & Fail? This will also clear all data.')) {
      this.topics = [];
      this.timeline = [];
      this.colorIndex = 0;
      this.initializeDefaultTopics();
      this.saveToStorage();
      this.updateCharts();
    }
  }

  exportData(): void {
    const totalsCSV = this.generateTotalsCSV();
    const eventsCSV = this.generateEventsCSV();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.downloadCSV(totalsCSV, `event-counter-totals-${timestamp}.csv`);
    this.downloadCSV(eventsCSV, `event-counter-events-${timestamp}.csv`);
  }

  private generateTotalsCSV(): string {
    let csv = 'Topic,Count\n';
    this.topics.forEach(topic => {
      csv += `"${topic.name}",${topic.count}\n`;
    });
    return csv;
  }

  private generateEventsCSV(): string {
    let csv = 'Topic,Timestamp (Epoch),Timestamp (ISO)\n';
    this.timeline.forEach(event => {
      csv += `"${event.topicName}",${event.timestamp},"${event.isoDatestamp}"\n`;
    });
    return csv;
  }

  private downloadCSV(csv: string, filename: string): void {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private updateCharts(): void {
    this.updatePieChart();
    this.updateLineChart();
  }

  private updatePieChart(): void {
    this.pieChartData.labels = this.topics.map(t => t.name);
    this.pieChartData.datasets[0].data = this.topics.map(t => t.count);
    this.pieChartData.datasets[0].backgroundColor = this.topics.map(t => t.color);
    this.pieChartData = { ...this.pieChartData };
  }

  private updateLineChart(): void {
    // Create a bar for each event, colored by topic
    const labels: string[] = [];
    const backgroundColors: string[] = [];
    const borderColors: string[] = [];
    const data: number[] = [];

    this.timeline.forEach((event, index) => {
      const topic = this.topics.find(t => t.id === event.topicId);
      labels.push(topic?.name.substring(0, 1) || 'E'); // First letter of topic name
      backgroundColors.push(topic?.color || '#999999');
      borderColors.push(topic?.color || '#999999');
      data.push(1); // Each event is represented as 1
    });

    this.lineChartData.labels = labels;
    this.lineChartData.datasets = [
      {
        label: 'Events',
        data: data,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 2
      }
    ];

    this.lineChartData = { ...this.lineChartData };
  }

  private saveToStorage(): void {
    const data = {
      topics: this.topics,
      timeline: this.timeline
    };
    localStorage.setItem('eventCounterData', JSON.stringify(data));
  }

  private loadFromStorage(): void {
    const data = localStorage.getItem('eventCounterData');
    if (data) {
      try {
        const parsed = JSON.parse(data);
        this.topics = parsed.topics || [];
        this.timeline = parsed.timeline || [];
      } catch (e) {
        console.error('Failed to load from storage', e);
      }
    }
  }

  dismissAlert(): void {
    this.capacityReachedAlert = false;
  }

  getContrastColor(hexColor: string): string {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 155 ? '#000000' : '#FFFFFF';
  }
}
